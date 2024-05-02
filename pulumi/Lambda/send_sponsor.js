const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: "ca-central-1" });
  
//var RECEIVER = 'jackson@allanwark.com';
var RECEIVER = 'taylor.burns@absolutehumanperformance.com';
var SENDER = 'info@absolutehumanperformance.com';
exports.handler = async (event) => {
    return SendEmail(event).then( 
    (response) => { 
        var status = 200;
        return {
            headers: {
                "Access-Control-Allow-Headers" : "*",
                "Access-Control-Allow-Origin" : "https://www.ahpbaseball.com",
                "Access-Control-Allow-Methods" : "POST,OPTIONS"
            },
            statusCode: status,
        };
    }).catch( 
    (error) => {
        return {
            body: error.Message, 
            headers: {
                "Access-Control-Allow-Headers" : "*",
                "Access-Control-Allow-Origin" : "https://www.ahpbaseball.com",
                "Access-Control-Allow-Methods" : "POST,OPTIONS"
            },
            statusCode: error.statusCode,
        };    
    });    
};

function SendEmail(event) {    
  let data = event.body; 
  data = data.replace(/\r/g,'\\r');
  data = data.replace(/\n/g,'\\n');
  console.log(data);
  const payload = JSON.parse(data);
  const packages = GetPackages(payload);
  const params = { 
    Destination: { ToAddresses: [ RECEIVER ] },
    Message: {
        Body: {
            Text: { Data: 'Sponsor name: ' + payload.name + 
                          '\nContact Number: ' + payload.phone + 
                          '\nContact Email: ' + payload.email +
                          '\nCompany Name: ' + payload.business + 
                          '\nSelected Package(s): ' + packages + 
                          '\nSponsored Player(s): ' + payload.player_name,
                    Charset: 'UTF-8' }
        },
        Subject: { Data: 'New Support A Renegade Submission from ' + payload.name,
                    Charset: 'UTF-8' }
    },
    Source: SENDER
  };
  return ses.sendEmail(params).promise();
}

function GetPackages(payload) {
    var packages = ''; var maxIndex = Number(payload.pack_count);
    for (let I=0;I<=maxIndex;I++) {packages = packages + payload['package'+I]; console.log('payload[package'+I+']:' + payload['package'+I]); if (I != maxIndex) {packages = packages + ', '}}
    return packages;
}