'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function DashboardPage() {
  // Month & Data States
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Settings States
  const [emailInput, setEmailInput] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [docExportId, setDocExportId] = useState('');
  
  // Pipeline Sync States
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Idle');
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Chatbot Drawer States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your POPFLEX Review Intelligence Assistant. Ask me anything about customer ratings, fit complaints, fabric comfort, or durability alerts!',
      sources: []
    }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);
  
  const chatEndRef = useRef(null);

  // Initial Data Fetching
  useEffect(() => {
    fetchSettings();
    fetchAnalytics();
  }, []);

  // Auto-scroll chat body to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatOpen]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && !data.error) {
        setEmailInput(data.target_email || '');
        setSavedEmail(data.target_email || '');
        setDocExportId(data.doc_export_id || '');
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const fetchAnalytics = async (month = '') => {
    try {
      const url = month ? `/api/analytics?month=${month}` : '/api/analytics';
      const res = await fetch(url);
      const data = await res.json();
      if (data && !data.error) {
        setAnalytics(data);
        setSelectedMonth(data.month);
        if (data.availableMonths && data.availableMonths.length > 0) {
          setAvailableMonths(data.availableMonths);
        }
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    }
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setSelectedMonth(month);
    fetchAnalytics(month);
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_email: emailInput })
      });
      const data = await res.json();
      if (data.success) {
        setSavedEmail(emailInput);
        alert('Target email updated successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to update email settings.');
    }
  };

  const handleTriggerSync = async () => {
    if (syncRunning) return;
    setSyncRunning(true);
    setSyncSuccess(false);
    setSyncStatusText('Running reviews sync...');
    
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      
      if (data.success) {
        setSyncSuccess(true);
        setSyncStatusText('Sync and export completed!');
        
        // Refresh dashboard statistics
        fetchAnalytics(selectedMonth);
        fetchSettings();
        
        setTimeout(() => {
          setSyncStatusText('Idle');
          setSyncRunning(false);
        }, 5000);
      } else {
        setSyncStatusText(`Failed at ${data.phase || 'execution'}`);
        alert(`Sync failed: ${data.error}`);
        setSyncRunning(false);
      }
    } catch (err) {
      setSyncStatusText('Sync crashed.');
      alert('Connection to sync backend crashed.');
      setSyncRunning(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loadingChat) return;

    const userMessageText = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userMessageText }]);
    setLoadingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessageText })
      });
      const data = await res.json();

      if (data.error) {
        setChatHistory(prev => [...prev, { 
          sender: 'bot', 
          text: `Sorry, I encountered an issue: ${data.error}`,
          sources: [] 
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          sender: 'bot', 
          text: data.answer, 
          sources: data.sources || [] 
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        sender: 'bot', 
        text: 'Failed to connect to the assistant backend.',
        sources: [] 
      }]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Helper to color rank score badges
  const getScoreClass = (score) => {
    if (score >= 4.0) return styles.scorePositive;
    if (score >= 3.0) return styles.scoreWarning;
    return styles.scoreCritical;
  };

  // Helper to color themes
  const getThemeStatus = (rating) => {
    if (rating >= 4.0) return { text: 'Optimal', color: '#27AE60' };
    if (rating >= 3.0) return { text: 'Needs Monitoring', color: '#F1C40F' };
    return { text: 'Critical', color: '#E74C3C' };
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>POPFLEX Review Intelligence</h1>
          <p>Product Performance Health Dashboard & AI Assistant</p>
        </div>
        
        <div>
          <select 
            className={styles.monthSelector}
            value={selectedMonth} 
            onChange={handleMonthChange}
            disabled={syncRunning}
          >
            {availableMonths.length > 0 ? (
              availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))
            ) : (
              <option value={selectedMonth}>{selectedMonth}</option>
            )}
          </select>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Ingested Reviews</div>
          <div className={styles.statValue}>{analytics ? analytics.totalReviews : '-'}</div>
          <div className={styles.statSubtext}>Synced from Shopify Judge.me CDN</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Average Customer Rating</div>
          <div className={styles.statValue}>
            {analytics && analytics.avgRating ? `${analytics.avgRating.toFixed(2)} ★` : '-'}
          </div>
          <div className={styles.statSubtext}>Out of 5 stars total average</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Products Tracked</div>
          <div className={styles.statValue}>{analytics ? analytics.products.length : '-'}</div>
          <div className={styles.statSubtext}>Unique catalog product entries</div>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className={styles.mainContent}>
        {/* Left column: Leaderboard & Heatmaps */}
        <div>
          {/* Leaderboard Table */}
          <div className={styles.glassPanel}>
            <h2 className={styles.panelTitle}>Product Health Index Leaderboard</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.leaderboardTable}>
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>Volume</th>
                    <th>Avg Stars</th>
                    <th>Health Index</th>
                    <th>Primary Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics && analytics.products.length > 0 ? (
                    analytics.products.map(item => (
                      <tr key={item.sku}>
                        <td>
                          <div className={styles.productInfo}>
                            <span className={styles.productName}>{item.name}</span>
                            <span className={styles.productSku}>SKU: {item.sku}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.categoryTag}>{item.category}</span>
                        </td>
                        <td>{item.review_count}</td>
                        <td>{item.avg_rating.toFixed(1)} ★</td>
                        <td>
                          <span className={`${styles.scoreBadge} ${getScoreClass(item.health_score)}`}>
                            {item.health_score.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.issueText} ${item.primary_issue !== 'None' ? styles.issueActive : styles.issueNone}`}>
                            {item.primary_issue}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No rankings computed. Click manual sync to generate.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Theme Categorization Heatmap */}
          <div className={styles.glassPanel}>
            <h2 className={styles.panelTitle}>AI Theme Classification Breakdown</h2>
            <div className={styles.themeGrid}>
              {analytics && analytics.themes.length > 0 ? (
                analytics.themes.map(t => {
                  const status = getThemeStatus(t.avg_rating);
                  return (
                    <div className={styles.themeCard} key={t.theme_name}>
                      <div className={styles.themeDetails}>
                        <h3>{t.theme_name}</h3>
                        <p>{t.count} reviews tagged</p>
                      </div>
                      <div className={styles.themeRating}>
                        <div className={styles.ratingValue} style={{ color: status.color }}>
                          {t.avg_rating.toFixed(1)} ★
                        </div>
                        <div className={styles.ratingStatus} style={{ color: status.color, fontSize: '9px' }}>
                          {status.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>No NLP themes analyzed.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Controls & Sync status */}
        <div>
          <div className={styles.glassPanel}>
            <h2 className={styles.panelTitle}>Integration Center</h2>
            
            {/* Target Email Config */}
            <form onSubmit={handleSaveEmail} className={styles.settingsForm}>
              <div className={styles.inputGroup}>
                <label>Target Report Recipient</label>
                <input 
                  type="email" 
                  className={styles.textInput}
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  placeholder="operations@popflexactive.com"
                  disabled={syncRunning}
                />
              </div>
              <button 
                type="submit" 
                className={styles.buttonPrimary}
                disabled={syncRunning}
              >
                Save Destination Email
              </button>
            </form>

            {/* Sync trigger & status */}
            <div className={styles.syncContainer}>
              <div className={styles.syncStatusArea}>
                <span className={`${styles.statusIndicator} ${
                  syncRunning ? styles.statusSyncing : syncSuccess ? styles.statusSuccess : ''
                }`} />
                <span>Sync Status: <strong>{syncStatusText}</strong></span>
              </div>
              
              <button 
                className={styles.buttonPrimary} 
                onClick={handleTriggerSync}
                disabled={syncRunning}
                style={{ background: '#EFA697', color: '#0A0A0C' }}
              >
                {syncRunning ? 'Running Sync Pipeline...' : 'Manual Sync & Export Pipeline'}
              </button>

              {docExportId && (
                <a 
                  href={`https://docs.google.com/document/d/${docExportId}`}
                  target="_blank" 
                  rel="noreferrer"
                  className={styles.docExportLink}
                >
                  📄 View Monthly Google Doc Log
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Toggle */}
      <button 
        className={styles.chatToggleBtn} 
        onClick={() => setChatOpen(!chatOpen)}
        title="Open Review Assistant"
      >
        💬
      </button>

      {/* Chatbot Drawer */}
      {chatOpen && (
        <div className={styles.chatDrawer}>
          <div className={styles.chatHeader}>
            <div>
              <h2>POPFLEX AI Assistant</h2>
              <p>RAG reviews context matching</p>
            </div>
            <button className={styles.closeBtn} onClick={() => setChatOpen(false)}>✕</button>
          </div>

          <div className={styles.chatBody}>
            {chatHistory.map((chat, idx) => (
              <div 
                key={idx} 
                className={`${styles.messageRow} ${
                  chat.sender === 'user' ? styles.messageRowUser : styles.messageRowBot
                }`}
              >
                <div className={`${styles.messageBubble} ${
                  chat.sender === 'user' ? styles.bubbleUser : styles.bubbleBot
                }`}>
                  {chat.text}

                  {chat.sources && chat.sources.length > 0 && (
                    <div className={styles.sourcesArea}>
                      <div className={styles.sourceTitle}>Retrieved Sources:</div>
                      {chat.sources.map((src, sIdx) => (
                        <span 
                          key={sIdx} 
                          className={styles.sourceLink} 
                          title={`"${src.body}"`}
                        >
                          [Source {sIdx + 1}] {src.product_name} ({src.rating}★)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loadingChat && (
              <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                <div className={`${styles.messageBubble} ${styles.bubbleBot}`} style={{ opacity: 0.6 }}>
                  Thinking and searching reviews...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className={styles.chatInputArea}>
            <input 
              type="text" 
              className={styles.chatInput}
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Ask about fabric quality or fit..."
              disabled={loadingChat}
            />
            <button 
              type="submit" 
              className={styles.sendBtn}
              disabled={loadingChat}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
