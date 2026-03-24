import { useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import type { RoutingMessage } from '../../lib/types';
import './visualization.css';

interface ScriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
  type: 'dialogue' | 'action' | 'scene_start' | 'scene_end' | 'your_turn' | 'narration';
}

export function ScriptView() {
  // Subscribe to store - ensure component re-renders when messages change
  const messages = useAppStore(state => state.messages);
  const selectedSession = useAppStore(state => state.selectedSession);

  const scriptEntries = useMemo(() => {
    const entries: ScriptEntry[] = [];
    let sceneStartCount = 0;
    let sceneEndCount = 0;
    let dialogueCount = 0;
    let yourTurnCount = 0;
    let otherCount = 0;
    
    console.log('[ScriptView] useMemo running, messages count:', messages.length);

    if (!messages || messages.length === 0) {
      console.log('[ScriptView] No messages to process');
      return entries;
    }

    messages.forEach((msg: RoutingMessage, index) => {
      if (!msg) {
        console.log(`[ScriptView] Skipping null message at index ${index}`);
        return;
      }
      
      const speaker = msg.payload?.role as string || 
                     (msg.from?.startsWith('director-') ? 'Director' : msg.from || 'Unknown');
      const text = msg.payload?.text as string || '';

      // Handle scene_start messages
      if (msg.type === 'scene_start') {
        sceneStartCount++;
        entries.push({
          speaker: '场景',
          text: `${msg.payload?.location || '未知地点'} - ${msg.payload?.description || '场景开始'}`,
          timestamp: msg.timestamp || Date.now(),
          type: 'scene_start'
        });
      }
      // Handle scene_end messages  
      else if (msg.type === 'scene_end') {
        sceneEndCount++;
        entries.push({
          speaker: '场景',
          text: `场景结束 - ${msg.payload?.status || 'completed'}`,
          timestamp: msg.timestamp || Date.now(),
          type: 'scene_end'
        });
      }
      // Handle narration messages (director's backbone prose)
      else if (msg.type === 'narration' && text) {
        dialogueCount++;
        entries.push({
          speaker: '旁白',
          text,
          timestamp: msg.timestamp || Date.now(),
          type: 'narration'
        });
      }
      // Handle dialogue messages
      else if (msg.type === 'dialogue' && text) {
        dialogueCount++;
        entries.push({
          speaker,
          text,
          timestamp: msg.timestamp || Date.now(),
          type: 'dialogue'
        });
      }
      // Handle your_turn messages - show as stage direction
      else if (msg.type === 'your_turn') {
        yourTurnCount++;
        entries.push({
          speaker: '舞台指示',
          text: `${msg.payload?.actorId || 'Actor'} 的回合`,
          timestamp: msg.timestamp || Date.now(),
          type: 'action'
        });
      }
      // Log unhandled message types
      else {
        otherCount++;
        console.log(`[ScriptView] Unhandled message type: ${msg.type}`);
      }
    });

    console.log('[ScriptView] Filtering results:', {
      total: messages.length,
      sceneStart: sceneStartCount,
      sceneEnd: sceneEndCount,
      dialogue: dialogueCount,
      yourTurn: yourTurnCount,
      other: otherCount,
      entries: entries.length
    });

    return entries;
  }, [messages]);

  // Debug: log messages and entries
  useEffect(() => {
    console.log('[ScriptView] Messages updated, count:', messages.length);
    console.log('[ScriptView] Message types:', messages.map(m => m?.type));
    console.log('[ScriptView] Script entries count:', scriptEntries.length);
  }, [messages, scriptEntries]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calculate stats for display
  const yourTurnCount = messages.filter(m => m?.type === 'your_turn').length;
  const dialogueCount = messages.filter(m => m?.type === 'dialogue').length;
  const sceneStartCount = messages.filter(m => m?.type === 'scene_start').length;
  const sceneEndCount = messages.filter(m => m?.type === 'scene_end').length;
  
  if (scriptEntries.length === 0) {
    return (
      <div className="script-view">
        <div className="script-header">
          <h4>{selectedSession?.name || '剧本'}</h4>
          <span className="script-meta">0 条内容</span>
        </div>
        <div className="script-empty">
          <p>暂无剧本内容</p>
          <p className="script-empty-hint">场景开始后，对话将在这里以剧本格式显示</p>
          <div className="script-empty-debug" style={{ fontSize: '11px', marginTop: '15px', opacity: 0.6, textAlign: 'left' }}>
            <div>消息统计:</div>
            <div>• 总消息: {messages.length}</div>
            <div>• 场景开始: {sceneStartCount}</div>
            <div>• 场景结束: {sceneEndCount}</div>
            <div>• 对话: {dialogueCount}</div>
            <div>• 回合通知: {yourTurnCount}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="script-view">
      <div className="script-header">
        <h4>{selectedSession?.name || '剧本'}</h4>
        <span className="script-meta">{scriptEntries.length} 条内容</span>
      </div>
      
      <div className="script-content">
        {scriptEntries.map((entry, index) => (
          <div key={index} className={`script-entry script-entry-${entry.type}`}>
            {entry.type === 'scene_start' && (
              <div className="script-scene-header">
                <span className="scene-marker">▶ 场景开始</span>
                <span className="scene-location">{entry.text}</span>
                <span className="scene-time">{formatTime(entry.timestamp)}</span>
              </div>
            )}
            
            {entry.type === 'scene_end' && (
              <div className="script-scene-footer">
                <span className="scene-marker">◀ 场景结束</span>
                <span className="scene-status">{entry.text}</span>
                <span className="scene-time">{formatTime(entry.timestamp)}</span>
              </div>
            )}
            
            {entry.type === 'narration' && (
              <div className="script-narration">
                <div className="script-speaker">
                  <span className="speaker-name">📖 {entry.speaker}</span>
                  <span className="dialogue-time">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="script-text script-narration-text">{entry.text}</div>
              </div>
            )}
            
            {entry.type === 'dialogue' && (
              <div className="script-dialogue">
                <div className="script-speaker">
                  <span className="speaker-name">{entry.speaker}</span>
                  <span className="dialogue-time">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="script-text">{entry.text}</div>
              </div>
            )}
            
            {entry.type === 'action' && (
              <div className="script-action">
                <span className="action-marker">[</span>
                <span className="action-text">{entry.text}</span>
                <span className="action-marker">]</span>
                <span className="action-time">{formatTime(entry.timestamp)}</span>
              </div>
            )}
            
            {entry.type === 'your_turn' && (
              <div className="script-action">
                <span className="action-marker">[</span>
                <span className="action-text">{entry.text}</span>
                <span className="action-marker">]</span>
                <span className="action-time">{formatTime(entry.timestamp)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
