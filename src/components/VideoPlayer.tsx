import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { MonitorPlay, AlertCircle } from 'lucide-react';

interface Episode {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
}

interface VideoPlayerProps {
    episode: Episode;
    posterUrl: string;
    initialTime?: number;
    onTimeUpdate?: (currentTime: number, duration?: number) => void;
    onPause?: (currentTime: number, duration?: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ episode, posterUrl, initialTime = 0, onTimeUpdate, onPause }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [useIframe, setUseIframe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track if we have seeked to initialTime already for this episode
    const hasSeekedRef = useRef(false);

    useEffect(() => {
        // Reset state on episode change
        setUseIframe(false);
        setError(null);
        hasSeekedRef.current = false;

        const video = videoRef.current;
        if (!video) return;

        let hls: Hls | null = null;

        const initPlayer = () => {
            if (Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    backBufferLength: 90,
                });

                hls.loadSource(episode.link_m3u8);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (initialTime > 0 && !hasSeekedRef.current) {
                        video.currentTime = initialTime;
                        hasSeekedRef.current = true;
                    }
                    video.play().catch(e => console.log("Auto-play prevented", e));
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error("fatal network error encountered, try to recover");
                                hls?.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error("fatal media error encountered, try to recover");
                                hls?.recoverMediaError();
                                break;
                            default:
                                // cannot recover, fallback to iframe
                                hls?.destroy();
                                setUseIframe(true);
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native support
                video.src = episode.link_m3u8;
                video.addEventListener('loadedmetadata', () => {
                    if (initialTime > 0 && !hasSeekedRef.current) {
                        video.currentTime = initialTime;
                        hasSeekedRef.current = true;
                    }
                    video.play().catch(e => console.log("Auto-play prevented", e));
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
                onPause(video.currentTime);
            }
            if (hls) {
                hls.destroy();
            }
        };
    }, [episode, initialTime, useIframe]);

    const handleTimeUpdate = () => {
        if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration);
        }
    };

    const handlePause = () => {
        if (videoRef.current && onPause) {
            onPause(videoRef.current.currentTime, videoRef.current.duration);
        }
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

            <div className="video-container">
                {useIframe ? (
                    <iframe
                        src={episode.link_embed}
                        className="video-iframe"
                        allowFullScreen
                        frameBorder="0"
                        title={`Tập ${episode.name}`}
                    ></iframe>
                ) : (
                    <video
                        ref={videoRef}
                        className="video-element"
                        controls
                        poster={posterUrl}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onPause={handlePause}
                    />
                )}

                {error && (
                    <div className="player-error">
                        <AlertCircle size={32} />
                        <p>{error}</p>
                        <button onClick={() => setUseIframe(true)}>Chuyển sang nguồn dự phòng</button>
                    </div>
                )}
            </div>
        </div>
    );
};
