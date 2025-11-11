'use client';

import { useState } from 'react';

interface Player {
  id: number;
  discord_user_id: string;
  aoe4_world_id: string;
  display_name: string;
  score: number;
  rank: number;
  lastgame: string;
  wins: number;
  losses: number;
  win_rate: number;
  civilization: string;
  mode: string;
}

interface LeaderboardTableProps {
  players: Player[];
}

export default function LeaderboardTable({ players }: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<'score' | 'win_rate' | 'wins'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortOrder === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  const handleSort = (field: 'score' | 'win_rate' | 'wins') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-gray-900 shadow-lg';
    if (rank === 2) return 'bg-gray-400 text-gray-900 shadow-md';
    if (rank === 3) return 'bg-orange-400 text-gray-900 shadow-md';
    if (rank <= 10) return 'bg-green-500 text-white border border-green-400';
    return 'bg-gray-700 text-white border border-gray-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getCivEmoji = (civ: string) => {
    const emojis: { [key: string]: string } = {
      english: '🏴‍☠️',
      french: '🥖',
      hre: '⚔️',
      rus: '🐻',
      mongols: '🏹',
      chinese: '🐉',
      delhi: '🐘',
      abbasid: '📚',
      ottomans: '🌙',
      malians: '💰'
    };
    return emojis[civ] || '🎮';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`;
    return `${Math.floor(diffDays / 30)} mes`;
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden fade-in border border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-blue-700 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white text-center md:text-left">
              🏆 Ranking Brasileiro
            </h2>
            <p className="text-yellow-300 text-center md:text-left mt-2">
              {players.length} jogadores competitivos
            </p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button 
              onClick={() => handleSort('score')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                sortField === 'score' 
                  ? 'bg-yellow-500 text-gray-900' 
                  : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
              }`}
            >
              ELO {sortField === 'score' && (sortOrder === 'desc' ? '▼' : '▲')}
            </button>
            <button 
              onClick={() => handleSort('win_rate')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                sortField === 'win_rate' 
                  ? 'bg-yellow-500 text-gray-900' 
                  : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
              }`}
            >
              Win Rate {sortField === 'win_rate' && (sortOrder === 'desc' ? '▼' : '▲')}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 border-b-2 border-green-600">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Posição</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Jogador</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Civilização</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">ELO</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Vitórias</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Win Rate</th>
              <th className="px-6 py-4 text-left font-bold text-green-400 text-sm uppercase">Última Partida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedPlayers.map((player, index) => (
              <tr 
                key={player.id} 
                className="hover:bg-gray-800 transition duration-200 group bg-gray-900"
              >
                {/* Posição */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getRankColor(index + 1)}`}>
                    {getRankIcon(index + 1)}
                  </span>
                </td>

                {/* Jogador */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white group-hover:text-green-400">
                        {player.display_name}
                      </p>
                      <p className="text-sm text-gray-400">
                        Rank #{player.rank} • {player.mode.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Civilização */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCivEmoji(player.civilization)}</span>
                    <span className="capitalize font-medium text-gray-300">
                      {player.civilization}
                    </span>
                  </div>
                </td>

                {/* ELO */}
                <td className="px-6 py-4">
                  <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 px-3 py-1 rounded-full font-bold text-sm shadow">
                    {player.score}
                  </span>
                </td>

                {/* Vitórias */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 font-bold text-lg">{player.wins}W</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-red-400 text-lg">{player.losses}L</span>
                  </div>
                </td>

                {/* Win Rate */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-700 rounded-full h-2 shadow-inner">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          player.win_rate >= 60 ? 'bg-green-500' :
                          player.win_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(player.win_rate, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold text-sm min-w-12 ${
                      player.win_rate >= 60 ? 'text-green-400' :
                      player.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {player.win_rate}%
                    </span>
                  </div>
                </td>

                {/* Última Partida */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    {formatDate(player.lastgame)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {players.length === 0 && (
        <div className="text-center py-16 bg-gray-900">
          <div className="text-8xl mb-6">🎮</div>
          <h3 className="text-2xl font-semibold text-gray-400 mb-4">
            Nenhum jogador encontrado
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Os jogadores aparecerão aqui após se cadastrarem no bot do Discord usando <code className="bg-gray-800 px-2 py-1 rounded">/signup</code>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
        <p className="text-sm text-gray-400 text-center">
          💡 <strong className="text-yellow-400">Dica:</strong> Use <code className="bg-gray-700 px-2 py-1 rounded">/signup</code> no Discord para entrar no ranking!
        </p>
      </div>
    </div>
  );
}