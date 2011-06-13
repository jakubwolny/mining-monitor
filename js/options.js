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
     
    for(var p in pools){
        $('#tokens').append('<label for="' + p + '_token">' + pools[p].title + '</label><input type="text" name="' + p + '_token" id="' + p + '_token" /><br/>');                        
        
        $('#' + p + '_token').val(options[p].token).keyup();        
    }    
    
    $('#summary').attr('checked', options.summary).change();
    $('input[name="badge"]').val([options.badge]);

    $('form').submit(function(){
        var data = {           
            summary: $('#summary').is(':checked'),
            badge: $('input[name="badge"]:checked').val()
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
    
    $('#tokens_auto').click(function(){
        
        $.get('https://deepbit.net/settings', function(data){
            $('#deepbit_token').val($(data).find('#middle b:eq(1)').text());
        });
        
        $.get('https://mining.bitcoin.cz/accounts/token-manage/', function(data){
            $('#slush_token').val($(data).find('#token').val());
        });
        
        $.get('https://www.btcguild.com/my_api.php', function(data){
            $('#btcguild_token').val($(data).find('.middle b').text());
        });
        
        $.get('https://btcmine.com/user/profile/', function(data){
            $('#btcmine_token').val($(data).find('#id_auth_token').val());
        });        
    });
}