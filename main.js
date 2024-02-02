/*jshint esversion:6*/

$(function () {
    const video = $("video")[0];

    video.addEventListener("click", function() {
        console.log("Video was clicked!");
    });

    var model;
    var cameraMode = "environment"; // or "user"

    var counter = 0.0;
    
    var publishable_key = "rf_njgmXS5rJ8VPottWkfkviTpYwbQ2";
    var toLoad = {
        model: "20ziger",
        version: 1
    };

    const startVideoStreamPromise = navigator.mediaDevices
        .getUserMedia({
            audio: false,
            video: {
                facingMode: cameraMode
            }
        })
        .then(function (stream) {
            return new Promise(function (resolve) {
                video.srcObject = stream;
                video.onloadeddata = function () {
                    video.play();
                    resolve();
                };
            });
        });



    const loadModelPromise = new Promise(function (resolve, reject) {
        roboflow
            .auth({
                publishable_key: publishable_key
            })
            .load(toLoad)
            .then(function (m) {
                console.log("Model Loaded", m);
                model = m;
                model.configure({
                    threshold: 0.01,
                    overlap: 0.5,
                    max_objects: 1
                });
                resolve();
            });
    });

    Promise.all([startVideoStreamPromise, loadModelPromise]).then(function () {
        $("body").removeClass("loading");
        resizeCanvas();
        detectFrame();
    });

    var canvas, ctx;
    const font = "16px sans-serif";

    var isButtonClicked = false;
    $("#myButton").click(function() {
        console.log("Image !");
        isButtonClicked = true;
    });

    $("#myReset").click(function() {
        console.log("Resetting counter!");
        counter = initialCounter;
        $("#counterValue").text(counter);
        $("#predictions").text("Counter reset to " + counter);
    });

    function videoDimensions(video) {
        // Ratio of the video's intrisic dimensions
        var videoRatio = video.videoWidth / video.videoHeight;

        // The width and height of the video element
        var width = video.offsetWidth,
            height = video.offsetHeight;

        // The ratio of the element's width to its height
        var elementRatio = width / height;

        // If the video element is short and wide
        if (elementRatio > videoRatio) {
            width = height * videoRatio;
        } else {
            // It must be tall and thin, or exactly equal to the original ratio
            height = width / videoRatio;
        }

        return {
            width: width,
            height: height
        };
    }

    $(window).resize(function () {
        resizeCanvas();
    });

    const resizeCanvas = function () {
        $("canvas").remove();

        canvas = $("<canvas/>");

        ctx = canvas[0].getContext("2d");

        var dimensions = videoDimensions(video);

        console.log(
            video.videoWidth,
            video.videoHeight,
            video.offsetWidth,
            video.offsetHeight,
            dimensions
        );

        canvas[0].width = video.videoWidth;
        canvas[0].height = video.videoHeight;

        canvas.css({
            width: dimensions.width,
            height: dimensions.height,
            left: ($(window).width() - dimensions.width) / 2,
            top: ($(window).height() - dimensions.height) / 2
        });

        $("body").append(canvas);
    };

    const renderPredictions = function (predictions) {
        var dimensions = videoDimensions(video);

        var scale = 1;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        predictions.forEach(function (prediction) {
            const x = prediction.bbox.x;
            const y = prediction.bbox.y;

            const width = prediction.bbox.width;
            const height = prediction.bbox.height;

            // Draw the bounding box.
            ctx.strokeStyle = prediction.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(
                (x - width / 2) / scale,
                (y - height / 2) / scale,
                width / scale,
                height / scale
            );

            // Draw the label background.
            ctx.fillStyle = prediction.color;
            const textWidth = ctx.measureText(prediction.class).width;
            const textHeight = parseInt(font, 10); // base 10
            ctx.fillRect(
                (x - width / 2) / scale,
                (y - height / 2) / scale,
                textWidth + 8,
                textHeight + 4
            );
        });

        predictions.forEach(function (prediction) {
            const x = prediction.bbox.x;
            const y = prediction.bbox.y;

            const width = prediction.bbox.width;
            const height = prediction.bbox.height;

            // Draw the text last to ensure it's on top.
            ctx.font = font;
            ctx.textBaseline = "top";
            ctx.fillStyle = "#000000";
            ctx.fillText(
                prediction.class,
                (x - width / 2) / scale + 4,
                (y - height / 2) / scale + 1
            );
        });
    };

    var prevTime;
    var pastFrameTimes = [];
    const detectFrame = function () {
        if (!model) return requestAnimationFrame(detectFrame);
        if (!isButtonClicked) return requestAnimationFrame(detectFrame);
        model
            .detect(video)
            .then(function (predictions) {
                isButtonClicked = false;
                requestAnimationFrame(detectFrame);
                renderPredictions(predictions);
                
                const initialCounter = 501;
                let counter = initialCounter;
let test_text = predictions[0].class;
let points = 0;

if (test_text === "tripple20") {
    points = 60;
} else if (test_text === "Single20") {
    points = 20;
} else if (test_text === "Doppel20") {
    points = 40;
}

counter = initialCounter - points;
counter = Math.round(counter * 100) / 100;
$("#counterValue").text(counter);
$("#predictions").text(test_text + " (" + Math.round(points, 2) + ") was detected! New score: " + counter + " points!");

                //-----------------
            })
            .catch(function (e) {
                console.log("CAUGHT", e);
                isButtonClicked = false;
                requestAnimationFrame(detectFrame);
            });
    };
});
