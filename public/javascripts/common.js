/* jQquery combobox definition */
(function( $ ) {
    $.widget( "custom.combobox", {
        _create: function() {
            this.wrapper = $( "<span>" )
                .addClass( "custom-combobox" )
                .insertAfter( this.element );
            this.element.hide();
            this._createAutocomplete();
            this._createShowAllButton();
        },
        _createAutocomplete: function() {
            var selected = this.element.children( ":selected" ),
                value = selected.val() ? selected.text() : "";
            this.input = $( "<input>" )
                .appendTo( this.wrapper )
                .val( value )
                .attr( "title", "" )
                .addClass( "custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left" )
                .autocomplete({
                    delay: 0,
                    minLength: 0,
                    source: $.proxy( this, "_source" )
                })
                .tooltip({
                    tooltipClass: "ui-state-highlight"
                });
            this._on( this.input, {
                autocompleteselect: function( event, ui ) {
                    ui.item.option.selected = true;
                    this._trigger( "select", event, {
                        item: ui.item.option
                    });
                },
                autocompletechange: "_removeIfInvalid"
            });
        },
        _createShowAllButton: function() {
            var input = this.input,
                wasOpen = false;
            $( "<a>" )
                .attr( "tabIndex", -1 )
                .attr( "title", "Show All Items" )
                .tooltip()
                .appendTo( this.wrapper )
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass( "ui-corner-all" )
                .addClass( "custom-combobox-toggle ui-corner-right" )
                .mousedown(function() {
                    wasOpen = input.autocomplete( "widget" ).is( ":visible" );
                })
                .click(function() {
                    input.focus();
// Close if already visible
                    if ( wasOpen ) {
                        return;
                    }
// Pass empty string as value to search for, displaying all results
                    input.autocomplete( "search", "" );
                });
        },
        _source: function( request, response ) {
            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
            response( this.element.children( "option" ).map(function() {
                var text = $( this ).text();
                if ( this.value && ( !request.term || matcher.test(text) ) )
                    return {
                        label: text,
                        value: text,
                        option: this
                    };
            }) );
        },
        _removeIfInvalid: function( event, ui ) {
// Selected an item, nothing to do
            if ( ui.item ) {
                return;
            }
// Search for a match (case-insensitive)
            var value = this.input.val(),
                valueLowerCase = value.toLowerCase(),
                valid = false;
            this.element.children( "option" ).each(function() {
                if ( $( this ).text().toLowerCase() === valueLowerCase ) {
                    this.selected = valid = true;
                    return false;
                }
            });
// Found a match, nothing to do
            if ( valid ) {
                return;
            }
// Remove invalid value
            this.input
                .val( "" )
                .attr( "title", value + " didn't match any item" )
                .tooltip( "open" );
            this.element.val( "" );
            this._delay(function() {
                this.input.tooltip( "close" ).attr( "title", "" );
            }, 2500 );
            this.input.data( "ui-autocomplete" ).term = "";
        },
        _destroy: function() {
            this.wrapper.remove();
            this.element.show();
        }
    });
})( jQuery );

var MainModule = {};
MainModule.ShowAlertWindow = function(InfoData, reload){

    $('#dialog-message').remove();

    var ui_state_class;
    if(InfoData.MessageType === "Error"){
        ui_state_class = "ui-state-error";
    }else{
        ui_state_class = "ui-state-highlight";
    }

    $('body').append('<div id="dialog-message"><div class="' + ui_state_class + '"><ul id="InfoMessageList"></ul></div>');

    if(typeof(InfoData.MessageContent) == 'object'){
        for (var InfoMessage in InfoData.MessageContent)
        {
            $("#InfoMessageList").append('<li>' + InfoData.MessageContent[InfoMessage] + '</li>');
        }
    }else{
        $("#InfoMessageList").append('<li>' + InfoData.MessageContent + '</li>');
    }

    var dialog_options = { autoOpen: false, modal: true, buttons: {
        Ok: function() {
            if(reload == true){
                window.location = window.location.href;
            }
            $( this ).dialog( "close" );
        }
    }};
    if(typeof(InfoData.MessageType) !== 'undefined'){


        dialog_options.title = "<img style='position: relative; top: 4px; height: 20px; margin-right: 10px' src='/images/info_messages/" + InfoData.MessageType + ".png'>" + InfoData.MessageTitle;

    }else if(typeof(InfoData.MessageTitle) !== 'undefined'){

    }

    $("#dialog-message").dialog(dialog_options);
    $('#dialog-message').dialog('open');
};

var UserModule = {};
UserModule.CheckAuthFields = function(password_length){

    var check_result = true;

    $("#AuthForm").find('#email').validator({
        format: 'email',
        invalidEmpty: true,
        correct: function() {
            $("#AuthForm").find('#label_email').text('');
            $("#AuthForm").find('#email').attr("style","border: 1px solid grey");
        },
        error: function() {
            $("#AuthForm").find('#label_email').text('Incorrect email');
            $("#AuthForm").find('#email').attr("style","border: 1px solid red");
        }
    });

    if($("#AuthForm").find('#email').validator('validate') === false){
        check_result = false;
    }

    $('#password').validator({
        format: 'Alphanumeric',
        minLength : password_length,
        invalidEmpty: true,
        correct: function() {
            $('#label_password').text('');
            $('#password').attr("style","border: 1px solid grey");
        },
        error: function() {
            $('#label_password').text('Your password must be more than ' + password_length + ' symbols');
            $('#password').attr("style","border: 1px solid red");
        }
    });

    if($('#password').validator('validate') === false){
        check_result = false;
    }

    return check_result;
}
UserModule.CheckRegFields = function(name_length, password_length){

    var check_result = true;

    $("#RegForm").find('#email').validator({
        format: 'email',
        invalidEmpty: true,
        correct: function() {
            $("#RegForm").find('#label_email').text('');
            $("#RegForm").find('#email').attr("style","border: 1px solid grey");
        },
        error: function() {
            $("#RegForm").find('#label_email').text("Incorrect email");
            $("#RegForm").find('#email').attr("style","border: 1px solid red");
        }
    });

    if($("#RegForm").find('#email').validator('validate') === false){
        check_result = false;
    }

    $('#password_first').validator({
        format: 'Alphanumeric',
        minLength : password_length,
        invalidEmpty: true,
        correct: function() {
            $('#label_password_first').text('');
            $('#password_first').attr("style","border: 1px solid grey");
            $('#password_second').attr("style","border: 1px solid grey");
        },
        error: function() {
            $('#label_password_first').text('Your password must be more than ' + password_length + ' symbols');
            $('#password_first').attr("style","border: 1px solid red");
        }
    });

    if($('#password_first').validator('validate') === false){
        check_result = false;
    }

    $('#password_second').validator({
        invalidEmpty: true,
        format: 'Alphanumeric',
        equals: $('#password_first').val(),
        correct: function() {
            $('#label_password_second').text('');
            $('#password_second').attr("style","border: 1px solid grey");
        },
        error: function() {
            $('#label_password_second').text('Passwords do not match');
            $('#password_second').attr("style","border: 1px solid red");
        }
    });


    if($('#password_second').validator('validate') === false){
        check_result = false;

    }
    $('#name').validator({
        format: 'Alphanumeric',
        minLength : name_length,
        invalidEmpty: true,
        correct: function() {
            $('#label_name').text('');
            $('#name').attr("style","border: 1px solid grey");
        },
        error: function() {
            $('#label_name').text('Your name must be more than ' + name_length + ' symbols');
            $('#name').attr("style","border: 1px solid red");
        }
    });

    if($('#name').validator('validate') === false){
        check_result = false;
    }


    return check_result;
}

$(function () {

    var password_length = 6;
    var name_length = 3;

    $('body').append('<div id="AuthForm">' +
        '<table><tr><td>Email: </td><td><input type="text" id="email"></td></tr>' +
        '<tr><td colspan="2"><label id="label_email" class="auth_info_msg"></label></td></tr>' +
        '<tr><td>Password: </td><td><input type="password" id="password"></td></tr>' +
        '<tr><td colspan="2"><label id="label_password" class="auth_info_msg"></label></td></tr></table></div>');

    $('body').append('<div id="RegForm"><table><tr><td>Email: </td><td><input type="text" id="email"></td></tr>' +
        '<tr><td colspan="2"><label id="label_email" class="auth_info_msg"></label></td></tr>' +
        '<tr><td>Password: </td><td><input type="password" id="password_first"></td></tr>' +
        '<tr><td colspan="2"><label id="label_password_first" class="auth_info_msg"></label></td></tr>' +
        '<tr><td>Retype password: </td><td><input type="password" id="password_second"></td></tr>' +
        '<tr><td colspan="2"><label id="label_password_second" class="auth_info_msg"></label></td></tr>' +
        '<tr><td>Name: </td><td><input type="text" id="name"></td></tr>' +
        '<tr><td colspan="2"><label id="label_name" class="auth_info_msg"></label></td></tr>' +
        '</table></div>');





    $("#AuthForm").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Reset": function() {
                $("#AuthForm").find('#email').val("");
                $('#password').val("");
            },
            "Submit": function() {

                var check_result = UserModule.CheckAuthFields(password_length);

                if(check_result){

                    var password = MD5($('#password').val());

                    Socket.emit('Authorization', {'Email': $("#AuthForm").find('#email').val(), 'Password': password});
                }
            },
            "Close": function() {
                $( this ).dialog( "close" );
            }
        }
    });

    $("#RegForm").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Reset": function() {
                $("#RegForm").find('#email').val("");
                $('#password_first').val("");
                $('#password_second').val("");
                $('#name').val("");
            },
            "Create": function() {

                var check_result = UserModule.CheckRegFields(name_length, password_length);

                if(check_result){

                    var password = MD5($('#password_first').val());

                    Socket.emit('Registration', {'Email' : $("#RegForm").find('#email').val(), 'Password' : password, 'Name' : $('#name').val()});

                }
            },
            "Close": function() {
                $( this ).dialog( "close" );
            }
        }
    });

    $('#reg_link').click(function(ev){
        $("#RegForm").dialog("open");
    });

    $('#auth_link').click(function(ev){
        $("#AuthForm").dialog("open");
    });

    $('#logout_link').click(function(ev){
        Socket.emit('Logout');
    });

    $("#auth_link").button();
    $("#reg_link").button();
    $("#logout_link").button();

});