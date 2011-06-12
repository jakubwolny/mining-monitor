var data = {};
try {
    data = JSON.parse(localStorage.options);   
}catch(e){  
}
var defaults = chrome.extension.getBackgroundPage().defaults;
var pools = chrome.extension.getBackgroundPage().pools;
var options = $.extend({}, defaults, data);

window.onload = function(){
    $('.lang').text(function(){
        return chrome.i18n.getMessage($(this).attr('id'));
    });

    $('#save').val(chrome.i18n.getMessage('save'));
    
    $('input[type="text"]').keyup(function(){
        var count = 0;
        for(var pool in pools){
            if($('#' + pool + '_token').val() != ''){
                count++;            
            }
        }
        
        if(count > 1){
            $('#summary').attr('disabled', false);
        }else{
            $('#summary').attr('disabled', true);
        }
        
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });
     
    for(var pool in pools){
        $('#' + pool + '_token').val(options[pool].token).keyup();    
    }    
    
    $('#summary').attr('checked', options.summary).change();
    

    $('form').submit(function(){
        var data = {           
            summary: $('#summary').is(':checked')
        }
        for(var pool in pools){
            data[pool] = {
                token: $('#' + pool + '_token').val()
            }
        }
        console.log(data);
        window.localStorage.options = JSON.stringify(data);
        chrome.extension.getBackgroundPage().updateOptions();
        chrome.extension.getBackgroundPage().startRequest();
        $('#save').addClass('saved').val(chrome.i18n.getMessage('saved'));
        return false;
    }).change(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });
}