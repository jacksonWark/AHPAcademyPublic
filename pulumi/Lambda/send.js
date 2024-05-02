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
  const params = { 
    Destination: { ToAddresses: [ RECEIVER ] },
    Message: {
        Body: {
            Text: { Data: 'Name: ' + payload.player_name + 
                          '\nAge: ' + payload.player_age + 
                          '\nPosition(s): ' + payload.player_pos +
                          '\nLast Team Played On: ' + payload.player_team + 
                          '\nEmail: ' + payload.player_email + 
                          '\n\Additional Comments:\n' + payload.player_comment,
                    Charset: 'UTF-8' }
        },
        Subject: { Data: 'New Player Questionnaire Submission from ' + payload.player_name,
                    Charset: 'UTF-8' }
    },
    Source: SENDER
  };
  return ses.sendEmail(params).promise();
}