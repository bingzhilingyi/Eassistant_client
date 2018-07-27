var qaSystem = {
    //qa_service_url: "http://10.61.16.29:8522/qa", //服务地址
    qa_service_url: "http://localhost:8080/qa", //服务地址
    qa_recommendData: [], //推荐的数据源
    qa_noticeData: [], //自动提示的数据源
    qa_searching: false, //是否正在查询中，用来控制用户不能高频率查询
    token: 'zdRcLtPlnBTs55KWg9KJqbBHKadYlY', //访问服务的token
    domain: ['SRM', 'PAY', 'WZ', 'XM'] //域
};

//定义ajax
qaSystem.qa_my_ajax = function(opt) {
    //合并对象
    var object = $.extend({}, opt, {
        async: true,
        dataType: 'json',
        xhrFields: {
            withCredentials: true
        },
        crossDomain: true,
    });
    //执行ajax查询
    $.ajax(object);
};
//初始化
$(document).ready(function() {
    //查找排名最高的500个页面作为自动提示数据源
    qaSystem.qa_my_ajax({
        url: qaSystem.qa_service_url + '/client/findTopRank',
        data: {
            size: 500,
            token: qaSystem.token
        },
        success(data) {
            if (data && data.content) {
                var content = data.content;
                for (var i = 0; i < content.length; i++) {
                    //把所有数据推入自动提示数据源中
                    qaSystem.qa_noticeData.push(content[i].title);
                }
            }
            //初始化自动提示
            $("#qa_value").autocomplete({
                source: function(request, response) {
                    var terms = request.term;
                    if (!terms) {
                        return;
                    } else {
                        terms = terms.trim().split(/\s+/g);
                    };
                    response($.grep(qaSystem.qa_noticeData, function(value) {
                        var pass = true;
                        for (var j = 0; j < terms.length; j++) {
                            var reg = eval("/" + terms[j] + "+/i");
                            if (!reg.test(value)) {
                                pass = false;
                                break;
                            }
                        }
                        return pass;
                    }));
                },
                position: { my: "left bottom", at: "left top" },
                //collision: 'fit'
            });
        },
        error(e) {}
    });
    //查找根目录作为欢迎页内容
    qaSystem.qa_my_ajax({
        url: qaSystem.qa_service_url + '/client/findRoot',
        data: {
            token: qaSystem.token
        },
        success(data) {
            if (data && data.content) {
                var content = data.content;
                for (var i = 0; i < content.length; i++) {
                    //把数据推入欢迎页数据源中
                    qaSystem.qa_recommendData.push(content[i]);
                }
            }
            //生成欢迎与推荐信息
            qaSystem.qa_generatelist(qaSystem.qa_recommendData, "<b>您好，欢迎使用智能顾问系统！</b>您也许想咨询以下问题：");
        },
        error(e) {}
    });
});

//查询方法
qaSystem.qa_search = function() {
    var value = $.trim($("#qa_value").val());
    if (!value)
        return
    else if (value === 'clear') {
        $("#QaShowDiv").html('');
        $("#qa_value").val('');
        //生成欢迎与推荐信息
        qaSystem.qa_generatelist(qaSystem.qa_recommendData, "<b>您好，欢迎使用智能顾问系统！</b>您也许想咨询以下问题：");
        return;
    } else if (qaSystem.qa_searching) {
        //如果当前正在查询中，不让再查
        qaSystem.qa_generateLeftPop('正在查询中，请稍后...');
        return;
    }
    //生成右边的对话框
    qaSystem.qa_generateRightPop(value);
    //把查询中设置为是
    qaSystem.qa_searching = true;
    qaSystem.qa_my_ajax({
        url: qaSystem.qa_service_url + '/client/findByTitle',
        data: {
            title: value,
            token: "zdRcLtPlnBTs55KWg9KJqbBHKadYlY",
            domain: qaSystem.domain.toString()
        },
        success(data) {
            var d = data.content; //返回的节点信息
            //判断返回的节点信息title是否是你的查询值，是则说明返回的是精确查询结果
            if (d && d.title == value) {
                //有子集就显示子集列表
                if (d.child && d.child.length > 0) {
                    qaSystem.qa_generatelist(d.child);
                } else {
                    //无子集，则显示节点详细
                    qaSystem.qa_generateLeftPop(d.qaPage.htmlContent);
                }
            } else if (d && d.child && d.child.length > 0) {
                //如果返回结果是模糊查询且有值，返回模糊查询列表
                qaSystem.qa_generatelist(d.child);
            } else {
                qaSystem.qa_generateLeftPop("<p>抱歉，没有查询到与 <b>" + value + "</b> 有关的结果</p>" +
                    "<p>温馨提示：我们建议您用关键字进行查询，如：\"注册\" ,可以查询与注册有关的问题</p>");
            }
        },
        error(e) {
            qaSystem.qa_generateLeftPop("抱歉，查询出错了...");
        },
        complete() {
            //把查询中设置为否
            qaSystem.qa_searching = false;
        }
    });
};

//点击某标题进行查询的方法
qaSystem.qa_clickSearch = function(value) {
    $("#qa_value").val(value);
    qaSystem.qa_search();
};

//根据传入的数据生产list效果
qaSystem.qa_generatelist = function(data, message, appendMessage) {
    var value = $("#qa_value").val();
    var head = "<p>您想咨询什么有关<b> " + value + " </b>的问题？</p>";
    //如果message存在，用message做提示信息
    if (message) {
        head = "<p>" + message + "</p>"
    }
    //遍历数据组成列表
    var ul = "<ul>";
    for (var i = 0; i < data.length; i++) {
        ul += "<li><a class='childrenItem' onclick=\"qaSystem.qa_clickSearch('" + data[i].title + "')\">" +
            (i + 1) + '. ' + data[i].title + "</a></li>";
    }
    ul += "</ul>";
    qaSystem.qa_generateLeftPop(head + ul);
};

//生成右侧对话栏方法
qaSystem.qa_generateRightPop = function(value) {
    var myIcon = $("<div class='myIcon right'></div>").text('我');
    var pop = $("<div class='rightpop right'></div>").text(value);
    $("#QaShowDiv").append($("<div style='width:100%;height:1px;float:left'></div>"));
    $("#QaShowDiv").append(myIcon);
    $("#QaShowDiv").append(pop);
    qaSystem.qa_scrollTop()
}

//生成左侧对话栏方法
qaSystem.qa_generateLeftPop = function(value) {
    var qaIcon = $("<div class='qaIcon'></div>");
    var pop = $("<div class='leftpop'></div>").html(value);
    $("#QaShowDiv").append($("<div style='width:100%;height:1px;float:left'></div>"));
    $("#QaShowDiv").append(qaIcon);
    $("#QaShowDiv").append(pop);
    //图片点击放大效果
    qaSystem.qa_enLargeImage(pop);
    //如果返回数据大于350px,则默认显示350px，提供点击显示全部功能
    qaSystem.qa_handleNoticeBar(pop);
    qaSystem.qa_scrollTop();
}

//让输入框在最底下
qaSystem.qa_scrollTop = function() {
    $("#QaShowDiv").scrollTop($("#QaShowDiv")[0].scrollHeight);
}

//按下回车进行查询
qaSystem.qa_handlesearch = function(e) {
    var keynum;
    if (window.event) // IE
        keynum = e.keyCode;
    else if (e.which) // Netscape/Firefox/Opera
        keynum = e.which;
    if (keynum == 13) {
        qaSystem.qa_search();
        return false;
    }
    return true;
}

//如果高度过高，就生成显示/隐藏按钮
qaSystem.qa_handleNoticeBar = function(pop) {
    var originalheight = pop.css('height');
    if (parseInt(originalheight) > 350) {
        pop.css('height', '350px');
        var expand = $("<div class='notice_bar'>显示全部</div>")
            .click(function() {
                if ($(this).html() == '显示全部') {
                    $(this).html('隐藏');
                    pop.css('height', 'auto')
                } else {
                    $(this).html('显示全部');
                    pop.animate({
                        'height': '350px'
                    }, 200);
                }
            })
        pop.append(expand);
    }
}

//点击图片放大
qaSystem.qa_enLargeImage = function(pop) {
    pop.find("img").click(function() {
        var img = $("#qa-viewImage");
        if (img.length > 0) {
            img.find("img").attr("src", $(this).attr("src"));
            img.dialog("option", "position", {
                my: "center",
                at: "center",
                of: window //相对于window居中弹出
            }).dialog("open");
        } else {
            img = $("<div id='qa-viewImage' class='qa-viewImage'><img></img></div>");
            img.find("img").attr("src", $(this).attr("src"));
            img.dialog({
                resizable: false,
                height: "auto",
                width: "auto",
                //maxWidth: 800,
                modal: true,
                buttons: {},
                close: function(event, ui) {}
            });
        }
    });
}

//点击清空查询框的方法
qaSystem.qa_clear = function() {
    $("#QaShowDiv").html('');
    //生成欢迎与推荐信息
    qaSystem.qa_generatelist(qaSystem.qa_recommendData, "<b>您好，欢迎使用自动应答系统！</b>您也许想咨询以下问题：");
    //清空输入栏
    $("#qa_value").val('');
}

//点击显示或隐藏配置框的方法
qaSystem.qa_config = function() {
    $("#qaSettingDiv").slideToggle(1000);
}

qaSystem.setDomain = function() {
    qaSystem.domain = [];
    var elem = $("input[name='domain']");
    for (var i = 0; i < elem.length; i++) {
        if (elem.get(i).checked) {
            qaSystem.domain.push(elem.get(i).value);
        }
    }
}