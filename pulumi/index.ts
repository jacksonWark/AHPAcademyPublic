// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as mime from "mime";
import * as path from "path";


// Load the Pulumi program configuration. These act as the "parameters" to the Pulumi program,
// so that different Pulumi Stacks can be brought up using the same code.

const stackConfig = new pulumi.Config("static-website");

const config = {
    // pathToWebsiteContents is a relativepath to the website's contents.
    pathToWebsiteContents: stackConfig.require("pathToWebsiteContents"),
    // targetDomain is the domain/host to serve content at.
    targetDomain: stackConfig.require("targetDomain"),
    // (Optional) ACM certificate ARN for the target domain; must be in the us-east-1 region. If omitted, an ACM certificate will be created.
    certificateArn: stackConfig.get("certificateArn"),
    // If true create an A record for the www subdomain of targetDomain pointing to the generated cloudfront distribution.
    // If a certificate was generated it will support this subdomain.
    // default: true
    includeWWW: stackConfig.getBoolean("includeWWW") ?? true,
    
    // Lambda payload file locations
    send_payload_path: stackConfig.require("sendLambdaZip"),
    send_sponsor_payload_path: stackConfig.require("sendSponsorLambdaZip"),
    // Lambda IAM policies
    QuestionnairePolicyJSON: stackConfig.require("QuestionnairePolicyJSON"),
    SponsorshipPolicyJSON: stackConfig.require("SponsorshipPolicyJSON")
};


// Generate Origin Access Identity to access the private s3 bucket.
const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity("originAccessIdentity", {
    comment: "this is needed to setup s3 polices and make s3 not public.",
  });


// contentBucket is the S3 bucket that the website's contents will be stored in.
const contentBucket = new aws.s3.Bucket("ahp-site",
    {
        bucket: config.targetDomain,
        // Configure S3 to serve bucket contents as a website. This way S3 will automatically convert
        // requests for "foo/" to "foo/index.html".
        //acl: "public-read",
        
        website: {
            indexDocument: "index.html",
            errorDocument: "error.html",
        },
        /* grants: [ { permissions: ["READ"], type: "CanonicalUser", id: originAccessIdentity.s3CanonicalUserId, },] */
    });

// crawlDirectory recursive crawls the provided directory, applying the provided function
// to every file it contains. Doesn't handle cycles from symlinks.
function crawlDirectory(dir: string, f: (_: string) => void) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = `${dir}/${file}`;
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            crawlDirectory(filePath, f);
        }
        if (stat.isFile()) {
            f(filePath);
        }
    }
}

// Sync the contents of the source directory with the S3 bucket, which will in-turn show up on the CDN.
const webContentsRootPath = path.join(process.cwd(), config.pathToWebsiteContents);
console.log("Syncing contents from local disk at", webContentsRootPath);
crawlDirectory(
    webContentsRootPath,
    (filePath: string) => {
        var relativeFilePath = filePath.replace(webContentsRootPath + "/", "");
        // Remove file extensions from some webpages. Only rolling out for new or re-structured pages. 
        if (relativeFilePath.includes('.html') && (relativeFilePath.includes('brochure/') || relativeFilePath.includes('roster/') || relativeFilePath.includes('schedule/') || relativeFilePath.includes('staff/') ) ) { 
            relativeFilePath = relativeFilePath.replace('.html','')
        };
        const contentFile = new aws.s3.BucketObjectv2(
            relativeFilePath,
            {
                key: relativeFilePath,
                acl: "public-read",
                bucket: contentBucket,
                contentType: mime.getType(filePath) || undefined,
                source: new pulumi.asset.FileAsset(filePath),
            },
            {
                parent: contentBucket,
            }
           );
    });

// logsBucket is an S3 bucket that will contain the CDN's request logs.
const logsBucket = new aws.s3.Bucket("requestLogs",
    {
        bucket: `${config.targetDomain}-logs`,
        acl: "private",
    });

const tenMinutes = 60 * 10;

let certificateArn: pulumi.Input<string> = config.certificateArn!;

// if config.includeWWW include an alias for the www subdomain
const distributionAliases = config.includeWWW ? [config.targetDomain, `www.${config.targetDomain}`] : [config.targetDomain];

// distributionArgs configures the CloudFront distribution. Relevant documentation:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
// https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
const distributionArgs: aws.cloudfront.DistributionArgs = {
    retainOnDelete: true,

    enabled: true,
    // Alternate aliases the CloudFront distribution can be reached at, in addition to https://xxxx.cloudfront.net.
    // Required if you want to access the distribution via config.targetDomain as well.
    aliases: distributionAliases,

    // We only specify one origin for this distribution, the S3 content bucket.
    origins: [
        {
            originId: contentBucket.arn,
            domainName: contentBucket.bucketRegionalDomainName,
            s3OriginConfig: {
                originAccessIdentity: originAccessIdentity.cloudfrontAccessIdentityPath,
            },
        },
    ],

    defaultRootObject: "index.html",

    // A CloudFront distribution can configure different cache behaviors based on the request path.
    // Here we just specify a single, default cache behavior which is just read-only requests to S3.
    defaultCacheBehavior: {
        targetOriginId: contentBucket.arn,

        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD", "OPTIONS"],

        forwardedValues: {
            cookies: { forward: "none" },
            queryString: false,
        },

        minTtl: 1,
        defaultTtl: tenMinutes,
        maxTtl: tenMinutes,
        compress: true,
    },

    // "All" is the most broad distribution, and also the most expensive.
    // "100" is the least broad, and also the least expensive.
    priceClass: "PriceClass_100",

    // You can customize error responses. When CloudFront receives an error from the origin (e.g. S3 or some other
    // web service) it can return a different error code, and return the response for a different resource.
    customErrorResponses: [
        { errorCode: 404, responseCode: 404, responsePagePath: "/error.html" },
    ],

    restrictions: {
        geoRestriction: { restrictionType: "none", },
    },

    viewerCertificate: {
        acmCertificateArn: certificateArn,  // Per AWS, ACM certificate must be in the us-east-1 region.
        sslSupportMethod: "sni-only",
    },

    loggingConfig: {
        bucket: logsBucket.bucketDomainName,
        includeCookies: false,
        prefix: `${config.targetDomain}/`,
    },
};

const cdn = new aws.cloudfront.Distribution("cdn", distributionArgs);

const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: contentBucket.id, // refer to the bucket created earlier
    policy: pulumi.all([originAccessIdentity.iamArn, contentBucket.arn]).apply(([oaiArn, bucketArn]) =>JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
            Effect: "Allow",
            Principal: {
                AWS: oaiArn,
            }, // Only allow Cloudfront read access.
            Action: ["s3:GetObject"],
            Resource: [`${bucketArn}/*`], // Give Cloudfront access to the entire bucket.
            },
        ],
    })),
});


// Create player questionnaire lambda function IAM policy
const iamLambda = new aws.iam.Role("ahp-questionnaire-lambda", {
    assumeRolePolicy: `{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }`,
    inlinePolicies: [{name: "questionnaire-execution",policy: config.QuestionnairePolicyJSON,}]
});

// Create player sponsorship lambda function IAM policy
const iamLambdaSponsor = new aws.iam.Role("ahp-sponsorship-lambda", {
    assumeRolePolicy: `{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }`,
    inlinePolicies: [{name: "sponsorship-execution",policy: config.SponsorshipPolicyJSON,}]
});


// Load lambda payloads and IAM policies
const send_payload = new pulumi.asset.FileArchive(config.send_payload_path);
const send_sponsor_payload = new pulumi.asset.FileArchive(config.send_sponsor_payload_path);

const sendFunc = new aws.lambda.Function("ahp-questionnaire", { role: iamLambda.arn, handler: "send.handler", runtime: "nodejs14.x", code: send_payload, });
const sendSponsorFunc = new aws.lambda.Function("ahp-sponsorship", { role: iamLambdaSponsor.arn, handler: "send_sponsor.handler", runtime: "nodejs14.x", code: send_sponsor_payload, });

// Define API endpoints, including CORS options requests
type Endpoint = { path: string; method: "POST" | "GET" | "PUT"; handler: aws.lambda.Function; }; //CORS from https://github.com/pulumi/pulumi-awsx/issues/545
  
// Add CORS OPTIONS request endpoint for each Lambda function API endpoint under the same path and stage route
const addCors = (endpoints: Endpoint[], { restAPI }: awsx.apigateway.API) => {
    const { id } = restAPI;
  
    endpoints.map(async ({ path }) => {
        const name = path.replace("{", "").replace("}", "").replace("/", "-");
  
        const resource = id.apply((resolvedId) =>
            aws.apigateway.getResource({
            path: `/${path}`,
            restApiId: resolvedId,
            }),
        );
  
        // 
        const method = new aws.apigateway.Method(`api-method-${name}-CORS`, {
            authorization: "NONE",
            httpMethod: "OPTIONS",
            resourceId: resource.id,
            restApi: id,
        });
  
        const integration = new aws.apigateway.Integration(
            `api-integration-${name}`,
            {
                httpMethod: method.httpMethod,
                resourceId: resource.id,
                restApi: id,
                type: "MOCK",
                requestTemplates: {
                    "application/json": `{ statusCode: 200 }`,
                },
            },
            { dependsOn: method },
        );
  
        const response200 = new aws.apigateway.MethodResponse(
            `api-response-200-${name}`,
            {
            httpMethod: method.httpMethod,
            resourceId: resource.id,
            restApi: id,
            statusCode: "200",
            responseParameters: {
                "method.response.header.Access-Control-Allow-Origin": true,
                "method.response.header.Access-Control-Allow-Methods": true,
                "method.response.header.Access-Control-Allow-Headers": true,
            },
            },
            { dependsOn: integration },
        );
  
        new aws.apigateway.IntegrationResponse(
            `api-integration-response-${name}`,
            {
            httpMethod: method.httpMethod,
            resourceId: resource.id,
            responseTemplates: { "application/json": `{}` },
            responseParameters: {
                "method.response.header.Access-Control-Allow-Origin": "'https://www.ahpbaseball.com'",
                "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'",
                "method.response.header.Access-Control-Allow-Headers": "'*'",
            },
            restApi: id,
            statusCode: response200.statusCode,
            },
            { dependsOn: response200 },
        );
    });
};
  
export const createApiEndpoints = (endpoints: Endpoint[]) => {
    const api = new awsx.apigateway.API("ahp-forms", {
        stageName: "test",
        restApiArgs: {
        binaryMediaTypes: [],
        },
        routes: endpoints.map(({ path, method, handler }) => ({
            path,
            method,
            eventHandler: handler,
        })),
    });

    addCors(endpoints, api);

    return api;
};

const myEndpoints: Endpoint[] = [
    { // Player Questionnaire Form
        path: "join",
        method: "POST",
        handler: sendFunc,
    },
    { // Player Sponsorship Form
        path: "sponsor",
        method: "POST",
        handler: sendSponsorFunc,
    }
];


const apiEndpoint = createApiEndpoints(myEndpoints);

export const methodARN = apiEndpoint.deployment.executionArn;

/*
const resPolicy = new aws.lambda.Permission("api-gateway-permission", {
    action: "lambda:invokeFunction",
    "function": sendFunc.name,
    principal:"apigateway.amazonaws.com",
}); */

// Export properties from this stack. This prints them at the end of `pulumi up` and
// makes them easier to access from the pulumi.com.
export const contentBucketUri = pulumi.interpolate`s3://${contentBucket.bucket}`;
export const contentBucketWebsiteEndpoint = contentBucket.websiteEndpoint;
export const cloudFrontDomain = cdn.domainName;
export const targetDomainEndpoint = `https://${config.targetDomain}/`;
export const apiGatewayUri = apiEndpoint.url;