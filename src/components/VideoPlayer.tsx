import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
    MonitorPlay, 
    AlertCircle, 
    Play, 
    Pause, 
    RotateCcw, 
    RotateCw, 
    Volume2, 
    VolumeX, 
    SkipForward, 
    PictureInPicture2, 
    Settings, 
    Maximize, 
    Minimize,
    Mic,
    Loader2
} from 'lucide-react';

interface Episode {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
}

export interface VideoPlayerRef {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    getCurrentTime: () => number;
}

interface VideoPlayerProps {
    episode: Episode;
    posterUrl: string;
    initialTime?: number;
    onTimeUpdate?: (currentTime: number, duration?: number) => void;
    onPause?: (currentTime: number, duration?: number) => void;
    onPlay?: (currentTime: number) => void;
    onSeek?: (currentTime: number) => void;
    onNextEpisode?: () => void;
    hasNextEpisode?: boolean;
}

export const VideoPlayer = React.forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
    episode, 
    posterUrl, 
    initialTime = 0, 
    onTimeUpdate, 
    onPause,
    onPlay,
    onSeek,
    onNextEpisode,
    hasNextEpisode = false
}, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isSyncingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useImperativeHandle(ref, () => ({
        play: () => {
            if (videoRef.current && videoRef.current.paused) {
                isSyncingRef.current = true;
                videoRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        isSyncingRef.current = false;
                    })
                    .catch(e => {
                        console.log("Sync play error", e);
                        isSyncingRef.current = false;
                    });
            }
        },
        pause: () => {
            if (videoRef.current) {
                isSyncingRef.current = true;
                videoRef.current.pause();
                setIsPlaying(false);
                isSyncingRef.current = false;
            }
        },
        seek: (time: number) => {
            if (videoRef.current) {
                isSyncingRef.current = true;
                videoRef.current.currentTime = time;
                setCurrentTime(time);
                isSyncingRef.current = false;
            }
        },
        getCurrentTime: () => {
            return videoRef.current ? videoRef.current.currentTime : 0;
        }
    }));

    const [useIframe, setUseIframe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Custom Player UI States
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showAudioTooltip, setShowAudioTooltip] = useState(false);

    // HLS levels
    const [qualities, setQualities] = useState<any[]>([]);
    const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 is Auto

    // Track if seeked on start
    const hasSeekedRef = useRef(false);

    useEffect(() => {
        // Reset states on episode change
        setUseIframe(false);
        setError(null);
        setIsLoading(true);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setQualities([]);
        setCurrentQuality(-1);
        setShowQualityMenu(false);
        hasSeekedRef.current = false;

        const video = videoRef.current;
        if (!video) return;

        let hls: Hls | null = null;
        let networkRetryCount = 0;

        const initPlayer = () => {
            if (Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    backBufferLength: 90,
                });
                hlsRef.current = hls;

                hls.loadSource(episode.link_m3u8);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    if (initialTime > 0 && !hasSeekedRef.current) {
                        video.currentTime = initialTime;
                        hasSeekedRef.current = true;
                    }
                    setQualities(hls?.levels || []);
                    video.play()
                        .then(() => setIsPlaying(true))
                        .catch(e => console.log("Auto-play prevented", e));
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                if (networkRetryCount < 2) {
                                    networkRetryCount += 1;
                                    console.warn(`Fatal HLS network error, trying to recover (retry ${networkRetryCount}/2)...`);
                                    hls?.startLoad();
                                } else {
                                    console.error("HLS manifest network load failed 2 times. Automatically falling back to backup Embed iframe.");
                                    hls?.destroy();
                                    setUseIframe(true);
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error("fatal media error, trying to recover");
                                hls?.recoverMediaError();
                                break;
                            default:
                                hls?.destroy();
                                setUseIframe(true);
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS
                video.src = episode.link_m3u8;
                video.addEventListener('loadedmetadata', () => {
                    setIsLoading(false);
                    setDuration(video.duration);
                    if (initialTime > 0 && !hasSeekedRef.current) {
                        video.currentTime = initialTime;
                        hasSeekedRef.current = true;
                    }
                    video.play()
                        .then(() => setIsPlaying(true))
                        .catch(e => console.log("Auto-play prevented", e));
                });
                video.addEventListener('error', () => {
                    setUseIframe(true);
                });
            } else {
                setUseIframe(true);
            }
        };

        if (!useIframe) {
            initPlayer();
        }

        return () => {
            if (video && onPause) {
                onPause(video.currentTime, video.duration);
            }
            if (hls) {
                hls.destroy();
                hlsRef.current = null;
            }
        };
    }, [episode, initialTime, useIframe]);

    // Timeline progress tracking
    const handleTimeUpdateInternal = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (onTimeUpdate) {
                onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // Auto-hide controls mechanism
    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
                setShowQualityMenu(false);
                setShowAudioTooltip(false);
            }, 3000);
        }
    };

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isPlaying]);

    const handleMouseMove = () => {
        resetControlsTimeout();
    };

    // Video Control Functions
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
            if (onPause && !isSyncingRef.current) {
                onPause(video.currentTime, video.duration);
            }
        } else {
            const timeAtPlay = video.currentTime;
            video.play()
                .then(() => {
                    setIsPlaying(true);
                    if (onPlay && !isSyncingRef.current) {
                        onPlay(timeAtPlay);
                    }
                })
                .catch(e => console.error("Play failed", e));
        }
    };

    const seekOffset = (seconds: number) => {
        if (!videoRef.current) return;
        const targetTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (onSeek && !isSyncingRef.current) {
            onSeek(targetTime);
        }
        resetControlsTimeout();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
            if (onSeek && !isSyncingRef.current) {
                onSeek(time);
            }
        }
        resetControlsTimeout();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
        }
        resetControlsTimeout();
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        videoRef.current.muted = nextMuted;
        if (!nextMuted && volume === 0) {
            setVolume(0.5);
            videoRef.current.volume = 0.5;
        }
        resetControlsTimeout();
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(err => console.error(err));
        } else {
            document.exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch(err => console.error(err));
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Keyboard Shortcuts Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.hasAttribute('contenteditable')
            )) {
                return;
            }

            if (document.querySelector('.auth-modal-overlay')) {
                return;
            }

            if (useIframe) return;

            switch (e.key) {
                case ' ': // Spacebar
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft': // Seek back 10s
                    e.preventDefault();
                    seekOffset(-10);
                    break;
                case 'ArrowRight': // Seek forward 10s
                    e.preventDefault();
                    seekOffset(10);
                    break;
                case 'ArrowUp': // Volume up
                    e.preventDefault();
                    setVolume(prev => {
                        const nextVol = Math.min(prev + 0.1, 1);
                        if (videoRef.current) {
                            videoRef.current.volume = nextVol;
                            videoRef.current.muted = false;
                        }
                        setIsMuted(false);
                        return nextVol;
                    });
                    break;
                case 'ArrowDown': // Volume down
                    e.preventDefault();
                    setVolume(prev => {
                        const nextVol = Math.max(prev - 0.1, 0);
                        if (videoRef.current) {
                            videoRef.current.volume = nextVol;
                            videoRef.current.muted = nextVol === 0;
                        }
                        setIsMuted(nextVol === 0);
                        return nextVol;
                    });
                    break;
                case 'm':
                case 'M': // Toggle Mute
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                case 'F': // Toggle Fullscreen
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPlaying, duration, useIframe, isMuted, volume, isFullscreen]);

    const togglePiP = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (err) {
            console.error("PiP error", err);
        }
    };

    const selectQuality = (idx: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = idx;
            setCurrentQuality(idx);
        }
        setShowQualityMenu(false);
        resetControlsTimeout();
    };

    // Format Time: e.g. 3678 -> 1:01:18, 120 -> 02:00
    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds) || timeInSeconds === 0) return '00:00';
        const hrs = Math.floor(timeInSeconds / 3600);
        const mins = Math.floor((timeInSeconds % 3600) / 60);
        const secs = Math.floor(timeInSeconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-player-wrapper glass-panel">
            <div className="player-header">
                <MonitorPlay size={20} className="player-icon" />
                <h3>Đang phát: Tập {episode.name}</h3>

                <div className="player-controls-top">
                    <button
                        className={`source-btn ${!useIframe ? 'active' : ''}`}
                        onClick={() => setUseIframe(false)}
                    >
                        Nguồn VIP (HLS)
                    </button>
                    <button
                        className={`source-btn ${useIframe ? 'active' : ''}`}
                        onClick={() => setUseIframe(true)}
                    >
                        Nguồn Dự Phòng (Embed)
                    </button>
                </div>
            </div>

            <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
                className="video-container relative aspect-video bg-black rounded-xl overflow-hidden group select-none"
            >
                {useIframe ? (
                    <iframe
                        src={episode.link_embed}
                        className="video-iframe"
                        allowFullScreen
                        frameBorder="0"
                        title={`Tập ${episode.name}`}
                    ></iframe>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            className="video-element w-full h-full object-contain"
                            poster={posterUrl}
                            playsInline
                            onClick={togglePlay}
                            onTimeUpdate={handleTimeUpdateInternal}
                            onLoadedMetadata={handleLoadedMetadata}
                            onWaiting={() => setIsLoading(true)}
                            onPlaying={() => setIsLoading(false)}
                        />

                        {/* Loading Spinner overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                        )}

                        {/* Custom Controls Overlay */}
                        <div 
                            onClick={togglePlay}
                            className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end px-4 md:px-6 pb-4 md:pb-6 pt-10 z-20 transition-opacity duration-300 cursor-pointer ${
                                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        >
                            {/* Prevent clicks on the control bar itself from toggling play/pause */}
                            <div className="w-full flex flex-col justify-end cursor-default" onClick={(e) => e.stopPropagation()}>
                            {/* Seekbar Time indicators (displayed ABOVE seekbar) */}
                            <div className="flex justify-between items-center text-xs font-medium text-white/95 px-1 mb-2">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>

                            {/* Full-width Timeline / Seekbar */}
                            <div className="relative w-full group/timeline mb-4 flex items-center">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={duration || 100} 
                                    value={currentTime} 
                                    onChange={handleSeek}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none accent-primary"
                                    style={{
                                        background: `linear-gradient(to right, #ff5451 0%, #ff5451 ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.15) ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.15) 100%)`
                                    }}
                                />
                            </div>

                            {/* Row: Control Buttons */}
                            <div className="flex items-center justify-between text-white mt-1">
                                
                                {/* Left Side Controls */}
                                <div className="flex items-center gap-4 md:gap-5">
                                    {/* Play / Pause Toggle Circle */}
                                    <button 
                                        onClick={togglePlay}
                                        className="w-10 h-10 rounded-full border border-white/20 hover:border-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer shadow-lg shrink-0"
                                    >
                                        {isPlaying ? (
                                            <Pause size={18} fill="currentColor" className="text-white" />
                                        ) : (
                                            <Play size={18} fill="currentColor" className="text-white ml-0.5" />
                                        )}
                                    </button>

                                    {/* Rewind 10s */}
                                    <button 
                                        onClick={() => seekOffset(-10)} 
                                        className="hover:text-primary transition-colors cursor-pointer p-1 flex items-center justify-center relative select-none shrink-0"
                                        title="Lùi 10s"
                                    >
                                        <RotateCcw size={18} />
                                        <span className="absolute text-[8px] font-bold mt-[3px]">10</span>
                                    </button>

                                    {/* Forward 10s */}
                                    <button 
                                        onClick={() => seekOffset(10)} 
                                        className="hover:text-primary transition-colors cursor-pointer p-1 flex items-center justify-center relative select-none shrink-0"
                                        title="Tiến 10s"
                                    >
                                        <RotateCw size={18} />
                                        <span className="absolute text-[8px] font-bold mt-[3px]">10</span>
                                    </button>

                                    {/* Volume control */}
                                    <div className="flex items-center gap-2 group/volume shrink-0">
                                        <button 
                                            onClick={toggleMute} 
                                            className="hover:text-primary transition-colors cursor-pointer p-1"
                                            title={isMuted ? "Mở âm thanh" : "Tắt âm thanh"}
                                        >
                                            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                        </button>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="1" 
                                            step="0.05"
                                            value={isMuted ? 0 : volume} 
                                            onChange={handleVolumeChange} 
                                            className="w-0 group-hover/volume:w-16 md:group-hover/volume:w-20 overflow-hidden transition-all duration-300 h-1 rounded-lg appearance-none cursor-pointer focus:outline-none accent-white bg-white/30"
                                        />
                                    </div>
                                </div>

                                {/* Right Side Controls */}
                                <div className="flex items-center gap-4 md:gap-5">
                                    
                                    {/* Audio Tracks / Microphone */}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowAudioTooltip(!showAudioTooltip)} 
                                            className="hover:text-primary transition-colors cursor-pointer p-1"
                                            title="Cài đặt âm thanh"
                                        >
                                            <Mic size={18} />
                                        </button>
                                        {showAudioTooltip && (
                                            <div className="absolute bottom-10 right-0 w-32 glass-panel rounded-xl border border-white/10 shadow-2xl p-2 z-50 text-[10px] text-center font-bold text-primary animate-fade-in-scale">
                                                Đường tiếng: Gốc
                                            </div>
                                        )}
                                    </div>

                                    {/* Next Episode (Skipping) */}
                                    <button 
                                        onClick={onNextEpisode} 
                                        disabled={!hasNextEpisode}
                                        className="hover:text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer p-1"
                                        title={hasNextEpisode ? "Tập tiếp theo" : "Hết tập"}
                                    >
                                        <SkipForward size={18} fill="currentColor" />
                                    </button>

                                    {/* Picture-in-Picture */}
                                    <button 
                                        onClick={togglePiP} 
                                        className="hover:text-primary transition-colors cursor-pointer p-1"
                                        title="Chế độ thu nhỏ (PiP)"
                                    >
                                        <PictureInPicture2 size={18} />
                                    </button>

                                    {/* Quality Selection / Gear */}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowQualityMenu(!showQualityMenu)} 
                                            className="hover:text-primary transition-colors cursor-pointer p-1 flex items-center relative"
                                            title="Chất lượng phát"
                                        >
                                            <Settings size={18} />
                                            {qualities.length > 0 && (
                                                <span className="absolute -top-1.5 -right-2 bg-primary text-[7px] text-white font-bold px-1 py-0.5 rounded-full uppercase scale-75 select-none font-sans">
                                                    {currentQuality === -1 ? 'Auto' : `${qualities[currentQuality]?.height}p`}
                                                </span>
                                            )}
                                        </button>

                                        {showQualityMenu && qualities.length > 0 && (
                                            <div className="absolute bottom-10 right-0 w-36 glass-panel rounded-xl border border-white/10 shadow-2xl p-2 z-50 flex flex-col gap-1 text-[11px] font-semibold animate-fade-in-scale">
                                                <div className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold px-2.5 py-1 border-b border-white/5 select-none">Chất lượng</div>
                                                <button 
                                                    onClick={() => selectQuality(-1)}
                                                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${currentQuality === -1 ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5'}`}
                                                >
                                                    Tự động (Auto)
                                                </button>
                                                {qualities.map((level, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => selectQuality(idx)}
                                                        className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${currentQuality === idx ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5'}`}
                                                    >
                                                        {level.height}p
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fullscreen Button */}
                                    <button 
                                        onClick={toggleFullscreen} 
                                        className="hover:text-primary transition-colors cursor-pointer p-1"
                                        title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                                    >
                                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                )}

                {error && (
                    <div className="player-error absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-6 z-20">
                        <AlertCircle size={32} className="text-primary mb-2" />
                        <p className="text-white text-sm mb-4">{error}</p>
                        <button 
                            onClick={() => setUseIframe(true)}
                            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-5 py-2 rounded-full cursor-pointer shadow-lg"
                        >
                            Chuyển sang nguồn dự phòng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
