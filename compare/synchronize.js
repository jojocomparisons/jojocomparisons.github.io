/**
 * Synchronize.js
 * Version 1.2.6
 *
 * Copyright (c) 2013-2016, Denis Meyer, calltopower88@googlemail.com
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/* jshint -W083 */
(function($) {
    var checkBuffer = true; // flag whether to check for the video buffers
    var checkBufferInterval = 1000; // ms
    var receivedEventLoadeddata_waitTimeout = 5000; // ms
    var bufferInterval = 2; // s
    var tryToPlayWhenBuffering = true; // flag for trying to play after n seconds of buffering
    var lastSynch = 0;
    var synchInterval = 1000; // ms
    // prevent that a slave video lags before even starting to synchronize
    var synchGap = 1.0; // s
    // maximum gap that is accepted before seeking (higher playback rate to fill the gap)
    var maxGap = 4; // s
    var playbackrateIncrease = 0.5;
    var playbackrateDecrease = -0.5;
    var seekAhead = 0.25; // s
    var pauseDelayThreshold = seekAhead + 0.05;
    var synchDelayThresholdPositive = 0.05;
    var synchDelayThresholdNegative = -0.05;
    var synchDelayThresholdFlash = 0.05;
    var bufferThreshold = 0.3;

    /* don't change the variables below */
    var debug = false; // set this via event 'sjs:debug'
    var videoIds = [];
    var videoIdsReady = {};
    var videoIdsInit = {};
    var masterVidNumber = 0;
    var masterVideoId;
    var nrOfPlayersReady = 0;
    var isBuffering = false;
    var startClicked = false;
    var bufferCheckerSet = false;
    var bufferChecker;
    var playWhenBuffered = false;
    var ignoreNextPause = false;
    var wasPlayingWhenSeeking = false;
    var hitPauseWhileBuffering = false;
    var tryToPlayWhenBufferingTimer = null;
    var tryToPlayWhenBufferingMS = 10000;
    var receivedEventLoadeddata = false;
    var receivedEventLoadeddata_interval = null;
    var waitingForSync = [];
    var usingFlash = false;

    $.synchronizeVideos = synchronizeVideos;

    function log(vals) {
        if (debug && window.console) {
            console.log(vals);
        }
    }

    /**
     * Checks whether a number is in an interval [lower, upper]
     *
     * @param num the number to check
     * @param lower lower check
     * @param upper upper check
     * @return true if num is in [lower, upper]
     */
    function isInInterval(num, lower, upper) {
        if (!isNaN(num) && !isNaN(lower) && !isNaN(upper) && (lower <= upper)) {
            return ((num >= lower) && (num <= upper));
        } else {
            return false;
        }
    }

    /**
     * Returns the video object
     *
     * @param id the video element id
     * @return the video object
     */
    function getVideoObj(id) {
        if (id) {
            if (!useVideoJs()) {
                return $('#' + id);
            } else {
                return videojs(id);
            }
        } else {
            log('SJS: [getVideoObj] Undefined video element id \'' + id + '\'');
            return undefined;
        }
    }

    /**
     * Returns the video
     *
     * @param id the video element id
     * @return the video object
     */
    function getVideo(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideoObj(id).get(0);
            } else {
                return videojs(id);
            }
        } else {
            log('SJS: [getVideo] Undefined video element id \'' + id + '\'');
            return undefined;
        }
    }

    /**
     * Returns whether videojs is being used
     *
     * @return true when video.js is being used
     */
    function useVideoJs() {
        return (typeof videojs !== 'undefined');
    }

    /**
     * Returns a video.js id
     *
     * @param videojsVideo the video.js video object
     * @return video.js id if videojsVideo is not undefined and video.js is being used
     */
    function getVideoId(videojsVideo) {
        if (useVideoJs() && videojsVideo) {
            var id = videojsVideo.id();
            return (id !== '') ? id : videojsVideo;
        } else {
            return videojsVideo;
        }
    }

    /**
     * Play the video
     *
     * @param id video id
     * @return true if id is not undefined and video plays
     */
    function play(id) {
        if (!isPaused(id)) {
            return false;
        }
        if (!allVideoIdsReady()) {
            log('SJS: [play] Not all video IDs are ready, yet');
            return false;
        }
        if (isBuffering) {
            log('SJS: [play] A video is currently buffering');
            return false;
        }
        if (id) {
            if (!useVideoJs()) {
                if (getVideo(id).paused || !getVideo(id).ended) {
                    log('SJS: [play] Playing video element id \'' + id + '\'');
                    getVideo(id).play();
                }
            } else if (!getVideo(id).paused() || !getVideo(id).ended()) {
                log('SJS: [play] Playing video element id \'' + id + '\'');
                getVideo(id).play();
            }
            return true;
        } else {
            log('SJS: [play] Undefined video element id \'' + id + '\'');
            return false;
        }
    }

    /**
     * Mute the video
     *
     * @param id video id
     * @return true if id is not undefined
     */
    function mute(id) {
        if (id) {
            var video = getVideo(id);
            if (!useVideoJs()) {
                if (!video.muted) {
                    log('SJS: [mute] Muting video element id \'' + id + '\'');
                    video.muted = true;
                }
            } else if (video.volume() > 0) {
                log('SJS: [mute] Muting video element id \'' + id + '\'');
                video.volume(0);
            }
        } else {
            log('SJS: [mute] Undefined video element id \'' + id + '\'');
            return undefined;
        }
    }

    /**
     * Unmute the video
     *
     * @param id video ID
     * @param volume in [0.0 - 1.0]
     * @return true if successfully unmuted, false else
     */
    function unmute(id, volume) {
        if (id && volume) {
            log('SJS: [unmute] Unmuting video element id \'' + id + '\'');
            var video = getVideo(id);
            if (!useVideoJs()) {
                video.muted = false;
                video.volume(volume);
            } else {
                video.volume(volume);
            }
            return true;
        } else {
            log('SJS: [unmute] Undefined video element id \'' + id + '\'');
        }
        return false;
    }

    /**
     * Returns the volume of a video element
     *
     * @param id video ID
     * @return the volume of a video element if id is defined, -1 else
     */
    function getVolume(id) {
        if (id) {
            log('SJS: [volume] Getting volume from video element id \'' + id + '\': ' + getVideo(id).volume());
            return getVideo(id).volume();
        } else {
            log('SJS: [volume] Undefined video element id \'' + id + '\'');
        }
        return -1;
    }

    /**
     * Pause video
     *
     * @param id video id
     * @return true if id is not undefined
     */
    function pause(id) {
        if (id) {
            log('SJS: [pause] Pausing video element id \'' + id + '\'');
            return getVideo(id).pause();
        } else {
            log('SJS: [pause] Undefined video element id \'' + id + '\'');
            return false;
        }
    }

    /**
     * Pauses all videos
     *
     * @param pauseMasterVideo Boolean flag whether to pause the master video as well or not
     */
    function pauseAll(pauseMasterVideo) {
        for (var i = 0; i < videoIds.length; ++i) {
            if ((pauseMasterVideo && (videoIds[i] === masterVideoId)) || (videoIds[i] !== masterVideoId)) {
                pause(videoIds[i]);
            }
        }
    }

    /**
     * Check whether video is paused
     *
     * @param id video id
     * @return true when id is not undefined and video is paused
     */
    function isPaused(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideo(id).paused;
            } else {
                if (id === masterVideoId) {
                    console.error('IS PAUSED', getVideo(id).paused());
                }
                return getVideo(id).paused();
            }
        } else {
            log('SJS: [isPaused] Undefined video element id \'' + id + '\'');
            return false;
        }
    }

    /**
     * Returns the video duration
     *
     * @param id video id
     * @return video duration if id is not undefined
     */
    function getDuration(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideo(id).duration;
            } else {
                return getVideo(id).duration();
            }
        } else {
            log('SJS: [getDuration] Undefined video element id \'' + id + '\'');
            return -1;
        }
    }

    /**
     * Returns the current time in the video
     *
     * @param id video id
     * @return current time if id is not undefined
     */
    function getCurrentTime(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideo(id).currentTime;
            } else {
                return getVideo(id).currentTime();
            }
        } else {
            log('SJS: [getCurrentTime] Undefined video element id \'' + id + '\'');
            return -1;
        }
    }

    /**
     * Sets the current time in the video
     *
     * @param id video id
     * @param time the time to set
     * @return true if time has been set if id is not undefined
     */
    function setCurrentTime(id, time) {
        if (id) {
            var duration = getDuration(id);
            if ((duration !== -1) && !isNaN(time) && (time >= 0) && (time <= duration)) {
                if (!useVideoJs()) {
                    getVideo(id).currentTime = time;
                } else {
                    getVideo(id).currentTime(time);
                }
                return true;
            } else {
                log('SJS: [setCurrentTime] Could not set time for video element id \'' + id + '\'');
                setCurrentTime(id, duration);
                return false;
            }
        } else {
            log('SJS: [setCurrentTime] Undefined video element id \'' + id + '\'');
            return false;
        }
    }

    /**
     * Returns the current playback rate of the video
     *
     * @param id video id
     * @return current time if id is not undefined
     */
    function getPlaybackRate(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideo(id).playbackRate;
            } else {
                return getVideo(id).playbackRate();
            }
        } else {
            log('SJS: [getPlaybackRate] Undefined video element id \'' + id + '\'');
            return 1.0;
        }
    }

    /**
     * Sets the playback rate for the video
     *
     * @param id video id
     * @param rate the speed at which the video plays
     * @return true if rate has been set if id is not undefined
     */
    function setPlaybackRate(id, rate) {
        if (id) {
            if (!useVideoJs()) {
                getVideo(id).playbackRate = rate;
            } else {
                getVideo(id).playbackRate(rate);
            }
            return true;
        } else {
            log('SJS: [setPlaybackRate] Undefined video element id \'' + id + '\'');
            return false;
        }
    }

    /**
     * Returns the buffer timerange
     *
     * @param id video id
     * @return buffer timeranmge if id is not undefined
     */
    function getBufferTimeRange(id) {
        if (id) {
            if (!useVideoJs()) {
                return getVideo(id).buffered;
            } else {
                return getVideo(id).buffered();
            }
        } else {
            log('SJS: [getBufferTimeRange] Undefined video element id \'' + id + '\'');
            return undefined;
        }
    }

    /**
     * Check whether a video element is in synch with the master
     *
     * @param videoId video id
     * @return 0 if video element is in synch with the master, a time else
     */
    function getSynchDelay(videoId) {
        var ctMaster = getCurrentTime(masterVideoId); // current time in seconds
        var ct = getCurrentTime(videoId); // current time in seconds
        if ((ctMaster !== -1) && (ct !== -1) && !isInInterval(ct, ctMaster - synchGap, ctMaster)) {
            return ct - ctMaster; // time difference
        }
        return 0; // delay is acceptable
    }

    /**
     * Fully resets all variables of synchronize.js
     */
    function reset() {
        videoIds = [];
        videoIdsReady = {};
        videoIdsInit = {};
        masterVidNumber = 0;
        masterVideoId = null;
        nrOfPlayersReady = 0;
        isBuffering = false;
        startClicked = false;
        bufferCheckerSet = false;
        bufferChecker = null;
        playWhenBuffered = false;
        ignoreNextPause = false;
        hitPauseWhileBuffering = false;
        wasPlayingWhenSeeking = false;
        tryToPlayWhenBufferingTimer = null;
        tryToPlayWhenBufferingMS = 10000;
        receivedEventLoadeddata = false;
        receivedEventLoadeddata_interval = null;
        waitingForSync = [];
        usingFlash = false;
    }

    /**
     * Select a new master video
     *
     * @return true if a new master video has been selected, false else
     */
    function selectNewMasterVideo() {
        if (videoIds.length <= 1) {
            return false;
        }
        var volume = getVolume(masterVideoId);
        for (var i = 0; i < videoIds.length; ++i) {
            if (videoIds[i] !== masterVideoId) {
                getVideoObj(masterVideoId).off();
                setMasterVideoId(i);
                break;
            }
        }
        registerEvents();
        unmute(masterVideoId, volume);

        return true;
    }

    /**
     * Removes a videodisplay from the list of videos being synchronized
     *
     * @param videoId video ID
     */
    function unsynchronizeVideo(videoId) {
        log('Unsynchronizing video with id ' + videoId);
        if (videoId === masterVideoId) {
            var masterPlayer = getVideoObj(masterVideoId);
            if (masterPlayer) {
                masterPlayer.off('play');
                masterPlayer.off('pause');
                masterPlayer.off('ratechange');
                masterPlayer.off('ended');
                masterPlayer.off('timeupdate');
            }
            // if only the master video is left, no video can be removed
            if (!selectNewMasterVideo()) {
                unsynchronize();
                return;
            }
        }
        for (var i = 0; i < videoIds.length; ++i) {
            if (videoIds[i] === videoId) {
                videoIds.splice(i, 1);
                $(document).trigger('sjs:idUnregistered', [videoId]);
                break;
            }
        }
        registerEvents();
        synchronize();
    }

    /**
     * Add a new video to the group of synced videos
     *
     * @param videoId video ID
     */
    function addVideoToSynchronization(videoId) {
        log('Adding video with id ' + videoId + ' to synchronization');
        // check whether video is already synced
        for (var i = 0; i < videoIds.length; ++i) {
            if (videoIds[i] === videoId) {
                return;
            }
        }
        videoIds.push(videoId);
        $(document).trigger('sjs:idRegistered', [videoId]);
        synchronize();
    }

    /**
     * Stops the synchronization and resets synchronize.js
     */
    function unsynchronize() {
        log('Unsynchronizing all videos');
        var masterPlayer = getVideoObj(masterVideoId);
        if (masterPlayer) {
            masterPlayer.off('play');
            masterPlayer.off('pause');
            masterPlayer.off('ratechange');
            masterPlayer.off('ended');
            masterPlayer.off('timeupdate');
        }

        reset();
    }

    /**
     * Synchronizes all slaves with the master
     */
    function synchronize() {
        lastSynch = Date.now();
        // for all video ids
        for (var i = 0; i < videoIds.length; ++i) {
            // except the master video
            if (videoIds[i] !== masterVideoId) {
                var doSeek = false;
                var synchDelay = getSynchDelay(videoIds[i]);

                mute(videoIds[i]);

                var masterPaused = isPaused(masterVideoId);
                if (masterPaused) {
                    doSeek = true;
                } else {
                    // if not using flash
                    if (!usingFlash) {
                        var playbackRateVideo = getPlaybackRate(videoIds[i]);
                        var playbackRateMaster = getPlaybackRate(masterVideoId);
                        if (synchDelay > synchDelayThresholdPositive) {
                            if (Math.abs(synchDelay) < maxGap) {
                                $(document).trigger('sjs:synchronizing', [getCurrentTime(masterVideoId), videoIds[i]]);
                                if (playbackRateVideo !== playbackRateMaster) {
                                    // set a slower playback rate for the video to let the master video catch up
                                    log('SJS: [synchronize] Decreasing playback rate of video element id \'' + videoIds[i] + '\' from ' + playbackRateVideo + ' to ' + (playbackRateMaster + playbackrateDecrease));
                                    setPlaybackRate(videoIds[i], (playbackRateMaster + playbackrateDecrease));
                                }
                            } else {
                                $(document).trigger('sjs:synchronizing', [getCurrentTime(masterVideoId), videoIds[i]]);
                                // set playback rate back to normal
                                setPlaybackRate(videoIds[i], getPlaybackRate(masterVideoId));
                                // mark for seeking
                                doSeek = true;
                            }
                        } else if (synchDelay < synchDelayThresholdNegative) {
                            if (Math.abs(synchDelay) < maxGap) {
                                $(document).trigger('sjs:synchronizing', [getCurrentTime(masterVideoId), videoIds[i]]);
                                if (playbackRateVideo !== playbackRateMaster) {
                                    // set a faster playback rate for the video to catch up to the master video
                                    log('SJS: [synchronize] Increasing playback rate of video element id \'' + videoIds[i] + '\' from ' + playbackRateVideo + ' to ' + (playbackRateMaster + playbackrateIncrease));
                                    setPlaybackRate(videoIds[i], (playbackRateMaster + playbackrateIncrease));
                                }
                            } else {
                                $(document).trigger('sjs:synchronizing', [getCurrentTime(masterVideoId), videoIds[i]]);
                                // set playback rate back to normal
                                setPlaybackRate(videoIds[i], getPlaybackRate(masterVideoId));
                                // mark for seeking
                                doSeek = true;
                            }
                        }
                        // everything is fine
                        else if (!isPaused(masterVideoId) && !waitingForSync[videoIds[i]]) {
                            // set playback rate back to normal
                            setPlaybackRate(videoIds[i], getPlaybackRate(masterVideoId));
                            // play the video
                            log('SJS: [synchronize] Playing video element id \'' + videoIds[i] + '\'');
                            play(videoIds[i]);
                        }
                    }
                    // if using flash
                    else if (usingFlash) {
                        if ((Math.abs(synchDelay) > synchDelayThresholdFlash) && (Math.abs(synchDelay) > pauseDelayThreshold)) {
                            doSeek = true;
                        }
                        // everything is fine
                        else if (!isPaused(masterVideoId) && !waitingForSync[videoIds[i]]) {
                            // play the video
                            log('SJS: [synchronize] Playing video element id \'' + videoIds[i] + '\'');
                            play(videoIds[i]);
                        }
                    }
                }

                // if marked for seeking
                if (doSeek) {
                    $(document).trigger('sjs:synchronizing', [getCurrentTime(masterVideoId), videoIds[i]]);
                    if (masterPaused) {
                        log('SJS: [synchronize] Seeking video element id \'' + videoIds[i] + '\': ' + (getCurrentTime(masterVideoId)));
                        if (setCurrentTime(videoIds[i], getCurrentTime(masterVideoId))) {
                            log('SJS: [synchronize] Pausing video element id \'' + videoIds[i] + '\' after seeking');
                            pause(videoIds[i]);
                        }
                    } else {
                        log('SJS: [synchronize] Seeking video element id \'' + videoIds[i] + '\': ' + (getCurrentTime(masterVideoId) + seekAhead));
                        if (setCurrentTime(videoIds[i], getCurrentTime(masterVideoId) + seekAhead)) {
                            play(videoIds[i]);
                            if (!waitingForSync[videoIds[i]]) {
                                log('SJS: [synchronize] Playing video element id \'' + videoIds[i] + '\' after seeking');
                                play(videoIds[i]);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Pause a video stream for a certain delay
     *
     * @param videoId ID of the video id to synch
     * @param delay delay
     */
    function syncPause(videoId, delay) {
        log('SJS: [syncPause] Synchronizing. Pausing video id \'' + videoId + '\' for ' + (delay / getPlaybackRate(masterVideoId)) + 's');
        waitingForSync[videoId] = true;
        pause(videoId);
        setTimeout(function() {
            waitingForSync[videoId] = false;
            if (!isPaused(masterVideoId)) {
                play(videoId);
                log('SJS: [syncPause] Synchronizing. Continuing to play video id \'' + videoId + '\' after ' + delay + 's');
            } else {
                log('SJS: [syncPause] Still pausing video id \'' + videoId + '\' after ' + delay + 's, as the master video is paused, too');
            }
        }, ((delay / getPlaybackRate(masterVideoId)) * 1000));
    }

    /**
     * Registers master events on all slaves
     */
    function registerEvents() {
        if (allVideoIdsInitialized()) {
            var masterPlayer = getVideoObj(masterVideoId);

            usingFlash = $('#' + masterVideoId + '_flash_api').length !== 0;

            masterPlayer.on('play', function() {
                log('SJS: Master received \'play\' event');
                $(document).trigger('sjs:masterPlay', [getCurrentTime(masterVideoId)]);
                hitPauseWhileBuffering = false;
                if (!bufferCheckerSet && checkBuffer) {
                    bufferCheckerSet = true;
                    setBufferChecker();
                }
                for (var i = 0; i < videoIds.length; ++i) {
                    if (videoIds[i] !== masterVideoId) {
                        play(videoIds[i]);
                        mute(videoIds[i]);
                    }
                }
            });

            masterPlayer.on('pause', function() {
                log('SJS: Master received \'pause\' event');
                $(document).trigger('sjs:masterPause', [getCurrentTime(masterVideoId)]);
                hitPauseWhileBuffering = !ignoreNextPause;
                ignoreNextPause = false;
                pauseAll(true);
            });

            masterPlayer.on('ratechange', function() {
                log('SJS: Master received \'ratechange\' event');
                $(document).trigger('sjs:masterPlaybackRateChanged', [getPlaybackRate(masterVideoId)]);
                for (var i = 0; i < videoIds.length; ++i) {
                    if (videoIds[i] !== masterVideoId) {
                        setPlaybackRate(videoIds[i], getPlaybackRate(masterVideoId));
                    }
                }
            });

            masterPlayer.on('ended', function() {
                log('SJS: Master received \'ended\' event');
                $(document).trigger('sjs:masterEnded', [getDuration(masterVideoId)]);
                hitPauseWhileBuffering = true;
                pauseAll(false);
                synchronize();
            });

            masterPlayer.on('timeupdate', function() {
                $(document).trigger('sjs:masterTimeupdate', [getCurrentTime(masterVideoId)]);
                hitPauseWhileBuffering = hitPauseWhileBuffering || !isPaused(masterVideoId);
                if (((Date.now() - lastSynch) >= synchInterval) || isPaused(masterVideoId)) {
                    synchronize();
                }
            });
        } else {
            pauseAll(true);
        }
    }

    /**
     * Checks every checkBufferInterval ms whether all videos have a buffer to continue playing.
     * If not:
     *   - player pauses automatically
     *   - starts automatically playing when enough has been buffered
     */
    function setBufferChecker() {
        bufferChecker = window.setInterval(function() {
            var allBuffered = true;
            var i;

            for (i = 0; i < videoIds.length; ++i) {
                var bufferedTimeRange = getBufferTimeRange(videoIds[i]);
                if (bufferedTimeRange) {
                    var duration = getDuration(videoIds[i]);
                    var currTimePlusBuffer = getCurrentTime(videoIds[i]) + bufferInterval;
                    var buffered = false;
                    for (var j = 0;
                        (j < bufferedTimeRange.length) && !buffered; ++j) {
                        currTimePlusBuffer = (currTimePlusBuffer >= duration) ? duration : currTimePlusBuffer;
                        if (isInInterval(currTimePlusBuffer,
                                bufferedTimeRange.start(j),
                                bufferedTimeRange.end(j) + bufferThreshold)) {
                            buffered = true;
                        }
                    }
                    allBuffered = allBuffered && buffered;
                    isBuffering = !allBuffered;
                } else {
                    // Do nothing
                }
            }

            if (!allBuffered) {
                playWhenBuffered = true;
                ignoreNextPause = true;
                pauseAll(true);
                $(document).trigger('sjs:buffering', []);
            } else if (playWhenBuffered && !hitPauseWhileBuffering) {
                playWhenBuffered = false;
                play(masterVideoId);
                hitPauseWhileBuffering = false;
                $(document).trigger('sjs:bufferedAndAutoplaying', []);
            } else if (playWhenBuffered) {
                playWhenBuffered = false;
                $(document).trigger('sjs:bufferedButNotAutoplaying', []);
            }
        }, checkBufferInterval);
    }

    /**
     * Sets a master video id
     *
     * @param playerMasterVideoNumber the video number of the master video
     */
    function setMasterVideoId(playerMasterVideoNumber) {
        masterVidNumber = (playerMasterVideoNumber < videoIds.length) ? playerMasterVideoNumber : 0;
        masterVideoId = videoIds[masterVidNumber];
        $(document).trigger('sjs:masterSet', [masterVideoId]);
    }

    /**
     * Waits for data being loaded and calls a function
     *
     * @param id video id
     * @param func function to call after data has been loaded
     */
    function doWhenDataLoaded(id, func) {
        if (id !== '') {
            getVideoObj(id).on('loadeddata', function() {
                receivedEventLoadeddata = true;
                if (func) {
                    func();
                }
            });
        } else {
            log('SJS: [doWhenDataLoaded] Undefined video element id \'' + id + '\'');
        }
    }

    /**
     * Checks whether all videos have been initialized
     *
     * @return true if all videos have been initialized, false else
     */
    function allVideoIdsInitialized() {
        if (!useVideoJs()) {
            return (nrOfPlayersReady === videoIds.length);
        } else {
            for (var i = 0; i < videoIds.length; ++i) {
                if (!videoIdsInit[videoIds[i]]) {
                    return false;
                }
            }
            return true;
        }
    }

    /**
     * Checks whether all videos are ready
     *
     * @return true if all videos are ready, false else
     */
    function allVideoIdsReady() {
        if (!useVideoJs()) {
            return (nrOfPlayersReady === videoIds.length);
        } else {
            for (var i = 0; i < videoIds.length; ++i) {
                if (!videoIdsReady[videoIds[i]]) {
                    return false;
                }
            }
            return true;
        }
    }

    /**
     * Initial play
     */
    function initialPlay() {
        pauseAll(true);
        startClicked = true;
    }

    /**
     * Initial pause
     */
    function initialPause() {
        pauseAll(true);
        startClicked = false;
    }

    /**
     * Stop trying to play when buffering timer
     */
    function stopTryToPlayWhenBufferingTimer() {
        if (tryToPlayWhenBufferingTimer !== null) {
            window.clearInterval(tryToPlayWhenBufferingTimer);
            tryToPlayWhenBufferingTimer = null;
        }
    }

    /**
     * Registers global events for video IDs
     */
    function registerVideoIDEvents(playerMasterVidNumber) {
        var i;
        if (!useVideoJs()) {
            for (i = 0; i < videoIds.length; ++i) {
                $(document).trigger('sjs:idRegistered', [videoIds[i]]);

                getVideoObj(videoIds[i]).on('play', initialPlay);
                getVideoObj(videoIds[i]).on('pause', initialPause);

                getVideoObj(videoIds[i]).ready(function() {
                    ++nrOfPlayersReady;

                    if (allVideoIdsInitialized()) {
                        setMasterVideoId(playerMasterVidNumber);
                        for (var i = 0; i < videoIds.length; ++i) {
                            getVideoObj(videoIds[i]).off('play', initialPlay);
                            getVideoObj(videoIds[i]).off('pause', initialPause);
                        }
                        registerEvents();
                        if (startClicked) {
                            play(masterVideoId);
                        }
                        $(document).trigger('sjs:allPlayersReady', []);
                    }
                });
            }
        } else {
            for (i = 0; i < videoIds.length; ++i) {
                $(document).trigger('sjs:idRegistered', [videoIds[i]]);

                getVideoObj(videoIds[i]).on('play', initialPlay);
                getVideoObj(videoIds[i]).on('pause', initialPause);
                getVideoObj(videoIds[i]).ready(function() {
                    var playerName = getVideoId(this);

                    videoIdsReady[playerName] = true;
                    doWhenDataLoaded(playerName, function() {
                        videoIdsInit[playerName] = true;

                        $(document).trigger('sjs:playerLoaded', [playerName]);

                        if (allVideoIdsInitialized()) {
                            setMasterVideoId(playerMasterVidNumber);
                            for (var j = 0; j < videoIds.length; ++j) {
                                getVideoObj(videoIds[j]).off('play', initialPlay);
                                getVideoObj(videoIds[j]).off('pause', initialPause);
                            }
                            registerEvents();
                            if (startClicked) {
                                play(masterVideoId);
                            }
                            $(document).trigger('sjs:allPlayersReady', []);
                        }
                    });

                    receivedEventLoadeddata_interval = window.setInterval(function() {
                        if (!receivedEventLoadeddata) {
                            for (var i = 0; i < videoIds.length; ++i) {
                                getVideoObj(videoIds[i]).trigger('loadeddata');
                            }
                        } else {
                            window.clearInterval(receivedEventLoadeddata_interval);
                            receivedEventLoadeddata_interval = null;
                        }
                    }, receivedEventLoadeddata_waitTimeout);
                });
            }
        }
    }

    /**
     * Registers synchronize global 'try to play when buffering' events
     */
    function registerSynchronizeTryToPlayWhenBufferingEvents() {
        if (tryToPlayWhenBuffering) {
            $(document)
                .on('sjs:buffering', function() {
                    log('SJS: Received \'sjs:buffering\' event');
                    tryToPlayWhenBufferingTimer = setInterval(function() {
                        if (allVideoIdsInitialized() && !hitPauseWhileBuffering) {
                            hitPauseWhileBuffering = false;
                            play(masterVideoId);
                            stopTryToPlayWhenBufferingTimer();
                        }
                    }, tryToPlayWhenBufferingMS);
                })
                .on('sjs:bufferedAndAutoplaying', function() {
                    log('SJS: Received \'sjs:bufferedAndAutoplaying\' event');
                    stopTryToPlayWhenBufferingTimer();
                })
                .on('sjs:bufferedButNotAutoplaying', function() {
                    log('SJS: Received \'sjs:bufferedButNotAutoplaying\' event');
                    stopTryToPlayWhenBufferingTimer();
                });
        }
    }

    /**
     * Registers synchronize global events
     */
    function registerSynchronizeEvents() {
        $(document)
            .on('sjs:play', function() {
                log('SJS: Received \'sjs:play\' event');
                if (allVideoIdsInitialized()) {
                    play(masterVideoId);
                }
            })
            .on('sjs:pause', function() {
                log('SJS: Received \'sjs:pause\' event');
                if (allVideoIdsInitialized()) {
                    pause(masterVideoId);
                }
            })
            .on('sjs:setCurrentTime', function(e, time) {
                log('SJS: Received \'sjs:setCurrentTime\' event');
                if (allVideoIdsInitialized()) {
                    setCurrentTime(masterVideoId, time);
                }
            })
            .on('sjs:synchronize', function() {
                log('SJS: Received \'sjs:synchronize\' event');
                if (allVideoIdsInitialized()) {
                    synchronize();
                }
            })
            .on('sjs:addToSynch', function(e, id) {
                log('SJS: Received \'sjs:addToSynch\' event');
                if (id) {
                    addVideoToSynchronization(id);
                }
            })
            .on('sjs:removeFromSynch', function(e, id) {
                log('SJS: Received \'sjs:removeFromSynch\' event');
                if (id) {
                    unsynchronizeVideo(id);
                }
            })
            .on('sjs:unsynchronize', function() {
                log('SJS: Received \'sjs:unsynchronize\' event');
                unsynchronize();
            })
            .on('sjs:startBufferChecker', function() {
                log('SJS: Received \'sjs:startBufferChecker\' event');
                if (!bufferCheckerSet) {
                    window.clearInterval(bufferChecker);
                    bufferCheckerSet = true;
                    setBufferChecker();
                }
            })
            .on('sjs:stopBufferChecker', function() {
                log('SJS: Received \'sjs:stopBufferChecker\' event');
                window.clearInterval(bufferChecker);
                bufferCheckerSet = false;
                isBuffering = false;
            });
    }

    /**
     * Gathers the video IDs to be synched.
     *
     * @param playerMasterVidNumber [0, n-1]
     * @param videoId1OrMediagroup A mediagroup or the first videoId
     * @param args The arguments of the call
     * @returns {boolean} True if the found IDs are valid, false else
     */
    function gatherVideos(playerMasterVidNumber, videoId1OrMediagroup, args) {
        var validIds = true;
        var i;

        // check for mediagroups
        if ((args.length === 2)) {
            var videosInMediagroup = $('video[mediagroup="' + videoId1OrMediagroup + '"]');

            for (i = 0; i < videosInMediagroup.length; ++i) {
                var l = videoIds.length;
                videoIds[l] = videosInMediagroup[i].getAttribute('id');
                // hack for video.js: Remove added id string
                var videoJsIdAddition = '_html5_api';
                videoIds[l] = (useVideoJs() && (videoIds[l].indexOf(videoJsIdAddition) !== -1)) ?
                    (videoIds[l].substr(0, videoIds[l].length - videoJsIdAddition.length)) : videoIds[l];
                videoIdsReady[videoIds[i - 1]] = false;
                videoIdsInit[videoIds[i - 1]] = false;
            }
        } else {
            masterVidNumber = playerMasterVidNumber;
            for (i = 1; i < args.length; ++i) {
                // check whether ids exist/are valid
                validIds = validIds && args[i] && $('#' + args[i]).length;
                if (!validIds) {
                    $(document).trigger('sjs:invalidId', [args[i]]);
                } else {
                    videoIds[videoIds.length] = args[i];
                    videoIdsReady[videoIds[i - 1]] = false;
                    videoIdsInit[videoIds[i - 1]] = false;
                }
            }
        }

        return validIds;
    }

    /**
     * Main method for synchronization.
     *
     * @param playerMasterVidNumber [0, n-1]
     * @param videoId1OrMediagroup A mediagroup or the first videoId
     * @param arguments [optional] Other video IDs as additional parameters of not selecting videos via mediagroup
     */
    function synchronizeVideos(playerMasterVidNumber, videoId1OrMediagroup) {
        var validIds = gatherVideos(playerMasterVidNumber, videoId1OrMediagroup, arguments);

        if (validIds && (videoIds.length > 1)) {
            registerVideoIDEvents(playerMasterVidNumber);
        } else {
            log('SJS: Not enough videos');
            $(document).trigger('sjs:notEnoughVideos', []);
        }

        registerSynchronizeTryToPlayWhenBufferingEvents();
        registerSynchronizeEvents();
    }

    // register debug events
    $(document).on('sjs:debug', function(e, _debug) {
        debug = _debug;
        log('SJS: Received \'sjs:debug\' event');
    });

})(jQuery);
