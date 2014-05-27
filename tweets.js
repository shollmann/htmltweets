"use strict";
/* Copyright (c) 2011, David Bengoa Rocandio
 * All rights reserved.
 *
 * This program is licensed under the Chicken Dance License v0.2
 *
 * You should have received a copy of the license text with this
 * software, along with instructions on how to perform the Chicken
 * Dance.
 *
 * Full license: http://bengoarocandio.com/html5tweets/COPYING
 * Chicken Dance instructions: http://bengoarocandio.com/html5tweets/DANCE
 */

var cwidth, cheight;
//Canvas width and height

var VEL = 1;

var FLY_TIME = 1000 * VEL;
var VIEW_TIME = 9000 * VEL;
// sarasa111

var searchTerm = location.hash || "#15delali";

var pos_map = {};
var used_tweets = {};
var avaliableTweets = [];
var avaliablePhotos = [];
var alphaAnimating = [];
var avaliableTweetsLastUpdated = 0;
var bannerVisible = true;

function v(x, y) {
    var flip = Math.random() > 0.5;
    var ret = {
        type : "v",
        tweet : null,
        x : x,
        y : y,
        w : 1,
        h : 2,
        r : flip ? 1 : 3,
        f : flip
    };
    pos_map[x + "_" + y] = ret;
    pos_map[x + "_" + (y + 1)] = ret;
    return ret;
}

function h(x, y) {
    var flip = Math.random() > 0.5;
    var ret = {
        type : "h",
        tweet : null,
        x : x,
        y : y,
        w : 2,
        h : 1,
        r : flip ? 2 : 0,
        f : flip
    };
    pos_map[x + "_" + y] = ret;
    pos_map[(x + 1) + "_" + y] = ret;
    return ret;
}

var tweet_holders = [v(1, 1), v(7, 7), v(2, 3), v(6, 7), v(2, 9), v(5, 2), v(3, 4), v(9, 9), v(2, 4)];

var U = 300;

var actualTweet = null, actualTweetAnimating = false, actualTweetBorn = 0, previousTweet = null;

for (var x = 1; x <= 9; ++x) {
    for (var y = 1; y <= 10; ++y) {
        if (!(x + "_" + y in pos_map)) {
            tweet_holders.push(h(x, y));
        }
    }
}

var $canvas = $("canvas"), canvas = $canvas[0], ctx = canvas.getContext("2d"), icanvas = document.createElement("canvas"), ictx = icanvas.getContext("2d"), $window = $(window), $body = $(document.body);

function updateCanvasSize() {
    cwidth = $window.width();
    cheight = $window.height() - 10;

    $canvas.attr({
        width : cwidth,
        height : cheight
    });
    scheduleAnimationFrame(render);
}

function avaliableCount() {
    return avaliablePhotos.length + avaliableTweets.length;
}

var lastFlickr = false;
// True if last obj was a photo
function nextAvaliable() {
    if (avaliablePhotos.length && avaliableTweets.length) {
        lastFlickr = !lastFlickr;
        return ( lastFlickr ? avaliablePhotos : avaliableTweets).shift();
    } else {
        return (avaliablePhotos.length && avaliablePhotos.shift()) || (avaliableTweets.length && avaliableTweets.shift())
    }
}

function insertarOrdenado(twt) {
    var ins = false, objList = twt.flickr ? avaliablePhotos : avaliableTweets;
    for (var i = 0, l = objList.length; i < l; ++i) {
        if (twt.id > objList[i].id) {
            ins = true;
            objList.splice(i, 0, twt);
            break;
        }
    }
    !ins && objList.push(twt);
    avaliableTweetsUpdated();
}

function addTweets(flickr, data) {

    var res = flickr ? data["photos"]["photo"] : data["results"];

    for (var i = 0; i < res.length; ++i) {
        var tweet = res[i];
        if (tweet.id in used_tweets && avaliableCount() > 0)
            continue;
        tweet.flickr = flickr;
        var img = new Image();
        var photo = new Image();
        tweet["imgelm"] = img;
        tweet["photo"] = photo;
        img.onload = (function(twt) {
            return function() {
                if (bannerVisible) {
                    //  Remove loading banner after the first tweet is received
                    $("#load").fadeOut();
                    bannerVisible = false;
                }
                insertarOrdenado(twt);
            }
        })(tweet);

        if (flickr) {
            img.src = "http://farm" + tweet.farm + ".staticflickr.com/" + tweet.server + "/" + tweet.id + "_" + tweet.secret + "_z.jpg";
        } else {
            //  images from twitter to show
            // Image of the tweet
            if (tweet.entities.media) {
                photo.src = tweet.entities.media[0].media_url;
            }
            // profile image
            img.src = tweet[ flickr ? "" : "profile_image_url"];
        }
    }
}

function loadTweets() {
    avaliableTweetsLastUpdated = +new Date();
    var baseUrl = "http://search.twitter.com/search.json?q=";
    // Search string with entities enabled to bring images on tweets
    $.getJSON(baseUrl + encodeURIComponent(searchTerm) + "&rpp=100&result_type=recent&include_entities=true&callback=?", addTweets.bind(this, false));

    // 	Commented to avoid showing Flickr pictures
    // $.getJSON("http://api.flickr.com/services/rest/?method=flickr.photos.search&tags=" + encodeURIComponent(searchTerm) + "&format=json&api_key=8a1a30adce6e6eb4600f0fae518f31aa&jsoncallback=?", addTweets.bind(this, true));
}

function isEmpty(x, y) {
    return !pos_map[x+"_"+y]["tweet"];
}

function validPos(x, y) {
    return x <= 9 && x >= 1 && y <= 10 && y >= 1
}

function getEmptyPlaceholder() {
    var ax = actualTweet.x, ay = actualTweet.y;

    for (var r = 1; r < 10; ++r) {

        //Filas horizontales
        for (var x = ax - r + 1; x < ax + r - 1; ++x) {
            if (validPos(x, ay + r) && isEmpty(x, ay + r)) {
                return pos_map[x + "_" + (ay + r)];
            }
        }
        for (var x = ax - r + 1; x < ax + r - 1; ++x) {
            if (validPos(x, ay - r) && isEmpty(x, ay - r)) {
                return pos_map[x + "_" + (ay - r)];
            }
        }
        //Filas verticales
        for (var y = ay - r + 1; y < ay + r - 1; ++y) {
            if (validPos(ax + r, y) && isEmpty(ax + r, y)) {
                return pos_map[(ax + r) + "_" + y];
            }
        }
        for (var y = ay - r + 1; y < ay + r - 1; ++y) {
            if (validPos(ax - r, y) && isEmpty(ax - r, y)) {
                return pos_map[(ax - r) + "_" + y];
            }
        }
        //Esquinas
        var esquinas = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
        for (var i = 0; i < 4; ++i) {
            if (validPos(ax + r * esquinas[i][0], ay + r * esquinas[i][1]) && isEmpty(ax + r * esquinas[i][0], ay + r * esquinas[i][1])) {
                return pos_map[(ax + r * esquinas[i][0]) + "_" + (ay + r * esquinas[i][1])];
            }
        }
    }
}

function updateInnerCanvas() {
    for (var i = 0, l = alphaAnimating.length; i < l; ++i) {
        var aainfo = alphaAnimating[i];
        var hld = aainfo[0];
        ictx.save();
        ictx.translate(hld.x * U, hld.y * U);
        ictx.rotate(hld.r * Math.PI / 2);

        if (hld.r == 2 || hld.r == 1) {
            ictx.translate(0, -U);
        }
        if (hld.r == 2 || hld.r == 3) {
            ictx.translate(-2 * U, 0);
        }
        // ictx.clearRect(0, 0, 2 * U, U);
        //         Clean every tweet in the screen
        ictx.clearRect(0, 0, (2 * U) + 5000, U + 5000);

        var opacity;
        if (new Date() - aainfo[3] > aainfo[4]) {
            alphaAnimating.splice(i, 1);
            i--;
            l--;
            opacity = aainfo[2];
            if (aainfo[2] == 0) {
                aainfo[0]["tweet"] = null;
            }
        } else {
            opacity = easeInOut(aainfo[1], aainfo[2], aainfo[4], new Date() - aainfo[3]);
        }

        if (cwidth <= 850) {
            // CHange these values to change the position of the main tweet
            hld["tweet"] && renderTweet(hld["tweet"], 250, 0, opacity);

        } else {
            // CHange these values to change the position of the main tweet
            hld["tweet"] && renderTweet(hld["tweet"], 80, 0, opacity);

        }
        ictx.restore();
    }
}

function freePlaceholdersIfNeeded() {
    var older_placeholders = [];

    for (var i = 0, l = tweet_holders.length; i < l; ++i) {
        if (tweet_holders[i]["tweet"]) {
            older_placeholders.push(tweet_holders[i]);
        }
    }
    if (older_placeholders.length > tweet_holders.length - 3) {//Si quedan menos de 3 libres
        var older = older_placeholders.sort(function(a,b){
        return a.tweet.born - b.tweet.born;
        })[0];
        alphaAnimating.push([older, 0, 0, +new Date(), 600]);
    }

}

function avaliableTweetsUpdated() {
    // if (new Date() - avaliableTweetsLastUpdated > 800000) {
        // loadTweets();
    // }
    if (avaliableCount() === 0) {
        loadTweets();
        return;
    }
    if (!actualTweet) {
        var ph = tweet_holders[8];
        ph.tweet = nextAvaliable();
        actualTweet = ph;
        actualTweetBorn = +new Date();
        ph.tweet.born = actualTweetBorn;
        alphaAnimating.push([ph, 0, 1, actualTweetBorn, 600]);
        scheduleAnimationFrame(render);
    } else if (new Date() - actualTweetBorn > VIEW_TIME) {
        var ph = getEmptyPlaceholder();
        ph.tweet = nextAvaliable();
        previousTweet = actualTweet;
        actualTweet = ph;
        actualTweetAnimating = true;
        actualTweetBorn = +new Date();
        ph.tweet.born = actualTweetBorn;

        alphaAnimating.push([actualTweet, 0, 1, actualTweetBorn, 600]);
        alphaAnimating.push([previousTweet, 1, 0, actualTweetBorn, 400]);

        freePlaceholdersIfNeeded();
        scheduleAnimationFrame(render);
    }
}

setInterval(avaliableTweetsUpdated, 1000);

function drawWords(words, x, y, color) {
    var dx = 0;
    for (var i = 0, l = words.length; i < l; ++i) {

        if (searchTerm.toLowerCase() == words[i].toLowerCase()) {
            ictx.fillStyle = "#2EB8E6";
        } else if (words[i][0] == "@") {
            ictx.fillStyle = "#ddd";
        } else if (/^https?:/.test(words[i])) {
            ictx.fillStyle = "#ddd";
        } else {
            ictx.fillStyle = "#fff";
        }
        ictx.fillText(words[i], x + dx, y, U * 2);

        dx += ictx.measureText(words[i] + " ").width;
    }
}

function renderTweet(tweet, x, y, op) {
    ictx.globalAlpha = op;
    //     If there is a FLickr image
    if (tweet.flickr) {
        var iw = tweet.imgelm.width, ih = tweet.imgelm.height;
        var h = Math.min(U, ih, (ih / iw) * (2 * U));
        var w = Math.min(2 * U, iw, (iw / ih) * U);
        // FLickr Image border
        ictx.fillStyle = "#ffffff";
        ictx.fillRect(x + (590 - w) / 2, y + (290 - h) / 2, w + 10, h + 10);

        ictx.drawImage(tweet.imgelm, x + (600 - w) / 2, y + (300 - h) / 2, w, h);
        return;
    }
    if (cwidth <= 1280) {
        var font_size = 24, padded_font_size = font_size + 2;
    } else {
        var font_size = 30, padded_font_size = font_size + 5;
    }
    var words = tweet["text"].split(/\s+/);
    ictx.fillStyle = "#000";
    ictx.font = "bold " + font_size + "px Sans-serif";

    var vpos = 1;
    var printed = 0;
    for (var i = 0, l = words.length; i <= l; ++i) {
        if (cwidth <= 1290) {
            if (ictx.measureText(words.slice(printed, i).join(" ")).width > U) {
                if (i - printed > 1) {
                    drawWords(words.slice(printed, i - 1), x + 5, y + vpos * padded_font_size);
                    printed = i - 1;
                    i--;
                } else {
                    drawWords([words[i]], x + 5, y + vpos * padded_font_size);
                    printed = i;
                }
                vpos++;
            }

        } else {
            if (ictx.measureText(words.slice(printed, i).join(" ")).width > (U * 2 - 10)) {
                if (i - printed > 1) {
                    drawWords(words.slice(printed, i - 1), x + 5, y + vpos * padded_font_size);
                    printed = i - 1;
                    i--;
                } else {
                    drawWords([words[i]], x + 5, y + vpos * padded_font_size);
                    printed = i;
                }
                vpos++;
            }

        }
    }
    if (printed < words.length) {
        drawWords(words.slice(printed, words.length), x + 5, y + vpos * padded_font_size);
    }
    ictx.fillStyle = "#ffffff";
    //     Profile picture
    if (tweet.entities.media) {
        if (cwidth <= 1290) {
            ictx.globalAlpha = op;
            // photo border and photo of the tweet
            ictx.fillRect(x + 5, y + (vpos + 0.8) * padded_font_size - 5, 280, 213);
            ictx.drawImage(tweet['photo'], x + 10, y + (vpos + 0.8) * padded_font_size, 270, 203);

            //  shows the profile image and the account who send the tweet with a fixed position because of the above image
            ictx.fillRect(x + 5, y + (vpos + 9.5) * padded_font_size - 5, 40, 40);
            ictx.drawImage(tweet['imgelm'], x + 10, y + (vpos + 9.5) * padded_font_size, 30, 30);
            ictx.fillStyle = "#ffffff";

            ictx.font = "22px Sans-serif";

            ictx.fillText("@" + tweet["from_user"] + ", " + prettyDate(tweet["created_at"]), x + 50, y + 30 + (vpos + 9.2) * padded_font_size);

        } else {
            ictx.globalAlpha = op;
            // photo border and photo of the tweet
            ictx.fillRect(x + 90, y + (vpos + 0.5) * padded_font_size - 5, 310, 310);
            ictx.drawImage(tweet['photo'], x + 95, y + (vpos + 0.5) * padded_font_size, 300, 300);

            //  shows the profile image and the account who send the tweet with a fixed position because of the above image
            ictx.fillRect(x + 10, y + (vpos + 9.7) * padded_font_size - 5, 60, 60);
            ictx.drawImage(tweet['imgelm'], x + 15, y + (vpos + 9.7) * padded_font_size, 50, 50);
            ictx.fillStyle = "#ffffff";

            ictx.font = "22px Sans-serif";

            ictx.fillText("@" + tweet["from_user"] + ", " + prettyDate(tweet["created_at"]), x + 75, y + 30 + (vpos + 9.7) * padded_font_size);

        }

    } else {
        //         Normal tweet without pic
        //     Frame for profile picture
        ictx.fillRect(x + 5, y + (vpos + 0.8) * padded_font_size - 5, 50, 50);
        // Profile Picture
        ictx.drawImage(tweet['imgelm'], x + 10, y + (vpos + 0.8) * padded_font_size, 40, 40);
        //  text of who and when send the tweet
        ictx.fillStyle = "#fff";
        ictx.font = "22px Sans-serif";

        ictx.fillText("@" + tweet["from_user"] + ", " + prettyDate(tweet["created_at"]), x + 60, y + 22 + (vpos + 0.85) * padded_font_size);
    }

}

function init() {
    icanvas.setAttribute("width", 10 * U);
    icanvas.setAttribute("height", 11 * U);

    updateCanvasSize();
    $window.resize(updateCanvasSize);
    loadTweets();
}

function camRot(r) {
    return (r % 2 == 1 ? r + 2 : r) * Math.PI / 2;
}

function render() {
    if (!actualTweet)
        return;

    updateInnerCanvas();

    ctx.clearRect(0, 0, cwidth + 100, cheight + 100);
    ctx.save();

    ctx.rotate(-Math.PI / 50);
    ctx.translate(cwidth / 2, cheight / 2);

    var dt = new Date() - actualTweetBorn;
    if (dt > FLY_TIME) {
        actualTweetAnimating = false;
    }
    var cx, cy;
    if (actualTweetAnimating) {
        ctx.rotate(easeInOut(camRot(previousTweet.r), camRot(actualTweet.r), FLY_TIME, dt));
        var cx = easeInOut(-(previousTweet.x + previousTweet.w / 2) * U, -(actualTweet.x + actualTweet.w / 2) * U, FLY_TIME, dt);
        var cy = easeInOut(-(previousTweet.y + previousTweet.h / 2) * U, -(actualTweet.y + actualTweet.h / 2) * U, FLY_TIME, dt);
    } else {
        ctx.rotate(camRot(actualTweet.r));
        var cx = -(actualTweet.x + actualTweet.w / 2) * U, cy = -(actualTweet.y + actualTweet.h / 2) * U;
    }
    ctx.translate(cx, cy);
    ctx.drawImage(icanvas, 0, 0);

    ctx.restore();
    if (actualTweetAnimating || alphaAnimating.length > 0)
        scheduleAnimationFrame(render);
}

window.addEventListener("MozBeforePaint", render, false);

var pow = Math.pow;
function easeInOut(minValue, maxValue, totalSteps, actualStep) {
    var t = Math.min(actualStep / totalSteps, 1) * 2, c = maxValue - minValue;
    if (t < 1) {
        return c / 2 * (pow(t, 3)) + minValue;
    } else {
        return c / 2 * (pow(t - 2, 3) + 2) + minValue;
    }
}

/*
* JavaScript Pretty Date
* Copyright (c) 2008 John Resig (jquery.com)
* Licensed under the MIT license.
*/

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time) {
    var date = new Date(time), diff = ((new Date() - date) / 1000), day_diff = Math.floor(diff / 86400);
    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
        return "hace ??? ";
    return day_diff == 0 && (diff < 60 && "hace " + Math.floor(diff) + " segundos" || diff < 120 && "hace 1 minuto" || diff < 3600 && "hace " + Math.floor(diff / 60) + " minutos" || diff < 7200 && "hace una hora" || diff < 86400 && "hace " + Math.floor(diff / 3600) + " horas") || day_diff == 1 && "ayer" || day_diff < 7 && "hace " + day_diff + " dias" || day_diff < 31 && "hace " + Math.ceil(day_diff / 7) + " semanas";
}

var scheduleAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || window.requestAnimationFrame ||
function(callback) {
    setTimeout(callback, 80);
};

init();
