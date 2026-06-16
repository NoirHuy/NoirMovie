import React from 'react';
import { Play } from 'lucide-react';

interface Episode {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
}

interface EpisodeListProps {
    episodes: Episode[];
    currentEpisodeSlug: string;
    onEpisodeSelect: (episode: Episode) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
    episodes,
    currentEpisodeSlug,
    onEpisodeSelect
}) => {
    return (
        <div className="episode-section glass-panel">
            <div className="episode-header">
                <h3>Danh Sách Tập</h3>
                <span className="episode-count">{episodes.length} Tập</span>
            </div>

            <div className="episode-grid">
                {episodes.map((ep) => {
                    const isActive = ep.slug === currentEpisodeSlug;
                    return (
                        <button
                            key={ep.slug}
                            className={`episode-btn ${isActive ? 'active' : ''}`}
                            onClick={() => onEpisodeSelect(ep)}
                        >
                            <span className="episode-number">{ep.name}</span>
                            {isActive && <Play size={14} className="playing-icon" fill="currentColor" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
