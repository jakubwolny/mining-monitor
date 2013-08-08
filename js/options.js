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
        if(this.tagName != 'INPUT'){
            return chrome.i18n.getMessage($(this).attr('id'));
        }
    });
    
    $('input.lang').val(function(){        
        return chrome.i18n.getMessage($(this).attr('id'));
    });    
     
    for(var p in pools){
    
        var label = $("<label/>", {
            "class": "token",
            "id": p + '_token_label',
            "for": p + '_token'            
        });
        
        var link = $("<a/>", {            
            "href": pools[p].url,
            "text": pools[p].title,
            "target": "_blank"
        }).appendTo(label);
        
        var input = $("<input/>", {
            "type": "text",
            "name": p + '_token',
            "id": p + '_token'            
        });

        $('#tokens').append(label, input);
        $('#' + p + '_token').val(options[p].token).keyup();        
    }
    
    $('input[type="text"]').keyup(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });
    
    $('#convert').attr('checked', options.convert).change();
    $('input[name="badge"]').val([options.badge]);

    $('form').submit(function(){
        var data = {           
            convert: $('#convert').is(':checked'),
            badge: $('input[name="badge"]:checked').val()
        }
        for(var pool in pools){
            data[pool] = {
                token: $('#' + pool + '_token').val()
            }
        }

        window.localStorage.options = JSON.stringify(data);
        chrome.extension.getBackgroundPage().updateOptions();
        chrome.extension.getBackgroundPage().startRequest();
        $('#save').addClass('saved').val(chrome.i18n.getMessage('saved'));
        return false;
    }).change(function(){
        $('#save').removeClass('saved').val(chrome.i18n.getMessage('save'));
    });
    
    $('#tokens_auto').click(function(){
        for(var p in pools){
            $('#' + p + '_token_label').removeClass('ok error').addClass('loading');            
            (function(p){
                $.ajax({
                    url: pools[p].url + pools[p].token_url,
                    success: function(data){
                        var element = $(data).find(pools[p].token_selector);
                        var value = pools[p].token_getter(element); 
                        if(value){                         
                            $('#' + p + '_token_label').addClass('ok');
                            $('#' + p + '_token').val(value).keyup();
                        } else {
                            $('#' + p + '_token_label').addClass('error');
                        }
                    },
                    complete: function(){
                        $('#' + p + '_token_label').removeClass('loading');
                    },
                    error: function(){                     
                        $('#' + p + '_token_label').addClass('error');
                    }
                });
            })(p);
        }
    });
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-23642091-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();