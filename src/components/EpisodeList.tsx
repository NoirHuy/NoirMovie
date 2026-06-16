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
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h4 className="font-headline text-base md:text-lg font-bold text-white">Danh Sách Tập Phim</h4>
                <span className="text-xs text-on-surface-variant/75 font-semibold bg-surface-container-highest px-3 py-1 rounded-full border border-white/5">
                    {episodes.length} Tập
                </span>
            </div>

            {/* Grid list of episodes */}
            <div className="p-5 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                {episodes.map((ep) => {
                    const isActive = ep.slug === currentEpisodeSlug;
                    return (
                        <button
                            key={ep.slug}
                            onClick={() => onEpisodeSelect(ep)}
                            className={`py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 active:scale-95 border ${
                                isActive 
                                    ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(255,84,81,0.4)]' 
                                    : 'bg-surface-container border-white/5 text-on-surface-variant hover:bg-primary/20 hover:border-primary/30 hover:text-white'
                            }`}
                        >
                            <span>{ep.name}</span>
                            {isActive && <Play size={12} fill="currentColor" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
