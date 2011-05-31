var data = {};
try {
    data = JSON.parse(localStorage.options);   
}catch(e){  
}
var defaults = {
    deepbit: {
        token: ''
    },
    slush: {
        token: ''
    },
    btcguild: {
        token: ''
    }
};

var options = $.extend({}, defaults, data);

window.onload = function(){
    $('.lang').text(function(){
        return chrome.i18n.getMessage($(this).attr('id'));
    });

    $('#save').val(chrome.i18n.getMessage('save'));
     
    $('#restore_defaults').bind('click', function(){
        window.localStorage.options = JSON.stringify(defaults);
        location.reload();       
    });

    $('#deepbit_token').val(options.deepbit.token)
    $('#slush_token').val(options.slush.token)
    $('#btcguild_token').val(options.btcguild.token)

    $('input[type="text"]').keyup(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });

    $('form').submit(function(){
        var data = {
            deepbit: {
                token: $('#deepbit_token').val()
            },
            slush: {
                token: $('#slush_token').val()
            },
            btcguild: {
                token: $('#btcguild_token').val()
            }        
        }
        console.log(data);
        window.localStorage.options = JSON.stringify(data);
        chrome.extension.getBackgroundPage().updateOptions();
        $('#save').addClass('saved').val(chrome.i18n.getMessage('saved'));
        return false;
    }).change(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });
}