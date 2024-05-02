(function($){/*Form Submission*/
var href = document.location.href;
var lastPathSegment = href.substring(href.lastIndexOf('/') + 1);
if (lastPathSegment.includes('Support-A-Renegade')) { const btn=document.querySelector('#submitButton');btn.addEventListener('click',sendFormSponsor); }
else { const btn=document.querySelector('#submitButton');btn.addEventListener('click',sendForm); }

function HandleInvalid(event){alert(event.target.labels[0].innerHTML+' : '+event.target.validationMessage);};

// Player Questionnaire Form Send
function sendForm(event){
  event.preventDefault();
  var failure=document.querySelector('#form_failure');
  failure.style.visibility='hidden';
  var success=document.querySelector('#form_success');
  success.style.visibility='hidden';
  var formData=JSON.parse(JSON.stringify($('#player_form').serializeArray()));
  var payload='{"'+formData[0].name+'":"'+formData[0].value+'",'+'"'+formData[1].name+'":"'+formData[1].value+'",'+'"'+formData[2].name+'":"'+formData[2].value+'",'+'"'+formData[3].name+'":"'+formData[3].value+'",'+'"'+formData[4].name+'":"'+formData[4].value+'",'+'"'+formData[5].name+'":"'+formData[5].value+'"}';
  const name=document.querySelector('#player_name');
  name.oninvalid=HandleInvalid;
  const age=document.querySelector('#player_age');
  age.oninvalid=HandleInvalid;
  const email=document.querySelector('#player_email');
  email.oninvalid=HandleInvalid;
  if(name.checkValidity()){if(age.checkValidity()){if(email.checkValidity()){
    $.ajax({type:"POST",url :'https://301h3ol2i6.execute-api.ca-central-1.amazonaws.com/test/join',dataType:"json",crossDomain:"true",contentType:"application/json",data:payload,
      success:function(){/*clear form and show a success message*/document.querySelector("#player_form").reset();var success=document.querySelector('#form_success');success.style.visibility='visible';},
      error:function(error){/*show an error message*/if(error.status !=200){var failure=document.querySelector('#form_failure');failure.style.visibility='visible';console.log(error);}else{document.querySelector("#player_form").reset();var success=document.querySelector('#form_success');success.style.visibility='visible';}}});}}};};
  
//Player Sponsorship Form Send
function sendFormSponsor(event){
  event.preventDefault();
  var result=document.querySelector('#sendresult');
  var formData=$('#sponsor_form').serializeArray();
  if (formData[4].name == 'package') { 
    if (formData[0].value != '') {
      if (formData[1].value != '' || formData[2].value != '') {
        var payload='{'; var packCt = 0;for(let I=0;I<formData.length;I++){if(formData[I].name=='package') {payload=payload+'"'+formData[I].name+''+packCt+'":"'+formData[I].value+'",';packCt++} else{payload=payload+'"'+formData[I].name+'":"'+formData[I].value+'",';}};payload=payload+'"pack_count":"'+(packCt-1)+'"}'; 
        const name=document.querySelector('#name'); name.oninvalid=HandleInvalid;const phone=document.querySelector('#phone'); phone.oninvalid=HandleInvalid;const email=document.querySelector('#email'); email.oninvalid=HandleInvalid;const business=document.querySelector('#business'); business.oninvalid=HandleInvalid;
        if(name.checkValidity()){if(phone.checkValidity()){if(email.checkValidity()){if(business.checkValidity()){
          $.ajax({type:"POST",url :'https://301h3ol2i6.execute-api.ca-central-1.amazonaws.com/test/sponsor',dataType:"json",crossDomain:"true",contentType:"application/json",data:payload,
            success:function(){document.querySelector("#player_form").reset();var success=document.querySelector('#form_success');success.style.visibility='visible';},
            error:function(error){
              if(error.status !=200){result.innerText = 'Failed.';console.log(error)}
              else{document.querySelector("#sponsor_form").reset();result.innerText = 'Success!'}
        }})}}}} 
      } else { alert('Please enter an email address or phone number'); }
    } else { alert('Please enter your name'); }
  } else { alert('Please select a sponsorship package'); }
}; 
})(jQuery);