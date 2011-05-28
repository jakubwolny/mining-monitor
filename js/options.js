var data = {};
try {
    data = JSON.parse(localStorage.options);   
}catch(e){  
}
var defaults = {
    deepbit_token: ''  
//    deepbit_workers: 1,
//    deepbit_hashrate: 200
};

var options = $.extend({}, defaults, data);

window.onload = function(){

    $('#save').val(chrome.i18n.getMessage('save'));
     
    $('#restore_defaults').bind('click', function(){
        window.localStorage.options = JSON.stringify(defaults);
        location.reload();       
    });

    $('#deepbit_token').val(options.deepbit_token)
    //    $('#deepbit_workers').val(options.deepbit_workers)
    //    $('#deepbit_hashrate').val(options.deepbit_hashrate)


    $('input[type="text"]').keyup(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });

    $('form').submit(function(){
        var data = {
            deepbit_token: $('#deepbit_token').val()
        //            deepbit_workers: $('#deepbit_workers').val(),
        //            deepbit_hashrate: $('#deepbit_hashrate').val()
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