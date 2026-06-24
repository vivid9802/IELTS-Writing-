import React, { useState, useEffect, useRef } from "react";
import { 
  Award, 
  PenTool, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  BookOpen, 
  Sparkles, 
  History, 
  TrendingUp, 
  ArrowRight, 
  RefreshCw, 
  Trash2,
  ChevronRight,
  Info,
  Layers,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HistoryItem, IELTSEvaluation, IELTSPromptPreset } from "./types";
import { IELTS_PRESETS } from "./constants";

export default function App() {
  // Application State
  const [taskType, setTaskType] = useState<'1' | '2'>('2');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [promptText, setPromptText] = useState<string>('');
  const [essayText, setEssayText] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [evaluation, setEvaluation] = useState<IELTSEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // History list loaded from LocalStorage
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'corrections' | 'rewrites'>('scorecard');
  const [rewriteTab, setRewriteTab] = useState<'original' | 'band7' | 'band8'>('band8');
  const [selectedCriteriaTab, setSelectedCriteriaTab] = useState<'ta' | 'cc' | 'lr' | 'gra'>('ta');
  const [criteriaFramework, setCriteriaFramework] = useState<'ielts' | '7cat'>('ielts');
  const [selected7CatTab, setSelected7CatTab] = useState<'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5' | 'cat6' | 'cat7'>('cat1');
  
  // Real-time loading message rotators
  const loadingPhrases = [
    "Khởi tạo hệ thống chấm điểm IELTS AI...",
    "Đang phân tích đề bài và định dạng viết...",
    "Đếm chính xác số lượng từ vựng...",
    "Đang đánh giá tiêu chí Task Response (Đáp ứng yêu cầu đề)...",
    "Đang chấm điểm Coherence and Cohesion (Mạch lạc & liên kết)...",
    "Đang rà soát Lexical Resource (Độ đa dạng và chính xác của từ vựng)...",
    "Đang kiểm tra Grammatical Range and Accuracy (Sự đa dạng & độ chính xác ngữ pháp)...",
    "Đang xác định các lỗi câu trực tiếp để đề xuất chỉnh sửa...",
    "Đang soạn thảo bài mẫu đạt chuẩn Band 7.0...",
    "Đang biên soạn bài mẫu xuất sắc chuẩn Band 8.5+..."
  ];

  const loadingInterval = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ielts_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  // Update preset selections
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') {
      setPromptText('');
      setEssayText('');
    } else {
      const preset = IELTS_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setPromptText(preset.promptText);
        setTaskType(preset.taskType);
        setEssayText('');
      }
    }
  };

  // Pre-fill a preset on initial load if none selected
  useEffect(() => {
    if (IELTS_PRESETS.length > 0 && !selectedPresetId) {
      // Find first preset of active taskType
      const firstPreset = IELTS_PRESETS.find(p => p.taskType === taskType);
      if (firstPreset) {
        setSelectedPresetId(firstPreset.id);
        setPromptText(firstPreset.promptText);
      }
    }
  }, [taskType]);

  // Handle manual task type toggle
  const handleTaskTypeChange = (type: '1' | '2') => {
    setTaskType(type);
    const firstPreset = IELTS_PRESETS.find(p => p.taskType === type);
    if (firstPreset) {
      setSelectedPresetId(firstPreset.id);
      setPromptText(firstPreset.promptText);
    } else {
      setSelectedPresetId('custom');
      setPromptText('');
    }
    setEssayText('');
  };

  // Word count helper
  const getWordCount = (text: string) => {
    const clean = text.trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getWordCount(essayText);
  const minWords = taskType === '1' ? 150 : 250;
  const isWordCountSufficient = wordCount >= minWords;

  // Submit essay for evaluation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      setError("Vui lòng nhập đề bài IELTS.");
      return;
    }
    if (!essayText.trim() || wordCount < 10) {
      setError("Vui lòng nhập bài viết của bạn (tối thiểu 10 từ).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    setActiveTab('scorecard');
    setRewriteTab('band8');

    // Start cycling loading messages
    let msgIndex = 0;
    setLoadingMessage(loadingPhrases[0]);
    loadingInterval.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingPhrases.length;
      setLoadingMessage(loadingPhrases[msgIndex]);
    }, 2800);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          promptText,
          essayText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể chấm bài. Vui lòng thử lại.");
      }

      const result: IELTSEvaluation = await response.json();
      setEvaluation(result);

      // Save to history
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleString('vi-VN'),
        taskType,
        promptText,
        essayText,
        evaluation: result
      };

      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("ielts_history", JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi kết nối với máy chủ AI.");
    } finally {
      setIsLoading(false);
      if (loadingInterval.current) {
        clearInterval(loadingInterval.current);
      }
    }
  };

  // Load an item from history
  const loadHistoryItem = (item: HistoryItem) => {
    setTaskType(item.taskType);
    setSelectedPresetId('custom');
    setPromptText(item.promptText);
    setEssayText(item.essayText);
    setEvaluation(item.evaluation);
    setError(null);
    setActiveTab('scorecard');
    setRewriteTab('band8');
  };

  // Delete an item from history
  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("ielts_history", JSON.stringify(updated));
  };

  // Color helper for scores
  const getScoreColor = (score: number) => {
    if (score >= 7.5) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10";
    if (score >= 6.0) return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10";
    return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 7.5) return "text-emerald-500";
    if (score >= 6.0) return "text-amber-500";
    return "text-rose-500";
  };

  const getBandDescription = (score: number) => {
    if (score >= 8.5) return "Expert User (Xuất sắc)";
    if (score >= 7.5) return "Very Good User (Rất tốt)";
    if (score >= 6.5) return "Competent User (Khá tốt)";
    if (score >= 5.5) return "Modest User (Trung bình khá)";
    return "Limited User (Cần cải thiện nhiều)";
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1C1C1C] font-sans antialiased selection:bg-amber-100">
      {/* Upper Brand bar */}
      <header className="sticky top-0 z-40 bg-[#F9F7F2]/90 backdrop-blur-md border-b border-[#1C1C1C] px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="border border-[#1C1C1C] text-[#F9F7F2] bg-[#1C1C1C] p-2">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif italic text-2xl tracking-tight text-[#1C1C1C] leading-none">Critique.ai</h1>
              <p className="text-[10px] text-[#1C1C1C]/60 uppercase tracking-widest font-semibold mt-1">IELTS Writing Assistant AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#1C1C1C] bg-[#F2F0EB] px-3 py-1.5 border border-[#1C1C1C]">
              <span className="h-2 w-2 rounded-full bg-[#D97706] animate-pulse"></span>
              Gemini 3.5 Engine
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Input Workspace (5 cols on large screens) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Input card */}
            <div className="bg-[#F2F0EB]/40 border border-[#1C1C1C] p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-[#1C1C1C] pb-4">
                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-[#1C1C1C]" />
                  <h2 className="font-serif italic text-lg font-bold text-[#1C1C1C]">Khu vực soạn thảo</h2>
                </div>
                <div className="flex border border-[#1C1C1C] p-0.5 bg-[#F9F7F2]">
                  <button 
                    type="button"
                    onClick={() => handleTaskTypeChange('1')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      taskType === '1' 
                        ? 'bg-[#1C1C1C] text-[#F9F7F2]' 
                        : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'
                    }`}
                  >
                    Task 1
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleTaskTypeChange('2')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      taskType === '2' 
                        ? 'bg-[#1C1C1C] text-[#F9F7F2]' 
                        : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'
                    }`}
                  >
                    Task 2
                  </button>
                </div>
              </div>

              {/* Preset Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#1C1C1C] uppercase tracking-widest">Lựa chọn đề mẫu</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-[#F9F7F2] border border-[#1C1C1C] px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-0 transition-all text-[#1C1C1C] cursor-pointer"
                >
                  {IELTS_PRESETS.filter(p => p.taskType === taskType).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.title}
                    </option>
                  ))}
                  <option value="custom">✍️ Tự viết đề luận riêng...</option>
                </select>
              </div>

              {/* Prompt textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#1C1C1C] uppercase tracking-widest">Nội dung đề bài (Prompt)</label>
                <textarea
                  value={promptText}
                  onChange={(e) => {
                    setPromptText(e.target.value);
                    setSelectedPresetId('custom');
                  }}
                  placeholder="Nhập đề bài IELTS Writing tại đây..."
                  rows={3}
                  className="w-full bg-[#F9F7F2] border border-[#1C1C1C] p-3 text-xs leading-relaxed focus:outline-hidden transition-all resize-y text-[#1C1C1C] font-serif"
                />
              </div>

              {/* Essay body editor */}
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[#1C1C1C] uppercase tracking-widest">Bài viết của bạn</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                    isWordCountSufficient 
                      ? 'bg-[#F9F7F2] text-[#1C1C1C] border-[#1C1C1C]' 
                      : 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30'
                  }`}>
                    {wordCount} / {minWords} từ {isWordCountSufficient ? "✓" : ""}
                  </span>
                </div>
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder={
                    taskType === '1'
                      ? "Bắt đầu viết bài viết mô tả thông tin (ít nhất 150 từ)..."
                      : "Bắt đầu viết bài luận chính kiến (ít nhất 250 từ)..."
                  }
                  className="w-full min-h-[280px] lg:min-h-[380px] bg-[#F9F7F2] border border-[#1C1C1C] p-4 text-sm font-serif leading-relaxed focus:outline-hidden transition-all resize-y text-[#1C1C1C]"
                />
              </div>

              {/* Error box */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-400 text-red-950 text-xs p-3.5 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEssayText('');
                    setError(null);
                  }}
                  className="px-4 py-3 bg-transparent hover:bg-[#1C1C1C] hover:text-[#F9F7F2] text-[#1C1C1C] border border-[#1C1C1C] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  disabled={isLoading}
                >
                  Xoá bài
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-[#1C1C1C] hover:bg-transparent hover:text-[#1C1C1C] text-[#F9F7F2] border border-[#1C1C1C] font-bold py-3 px-4 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang chấm bài...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Phân tích & Chấm bài</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick tips box */}
            <div className="bg-[#1C1C1C] text-[#F9F7F2] p-5 flex flex-col gap-3.5 border border-[#1C1C1C]">
              <div className="flex items-center gap-2 text-amber-400">
                <Info className="h-4 w-4" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Tiêu chuẩn IELTS Examiner khuyên dùng</h3>
              </div>
              <ul className="text-xs text-[#F2F0EB]/80 flex flex-col gap-2.5 list-none p-0 m-0 font-serif leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span><strong>Task 1:</strong> Luôn viết đoạn Overview (Tổng quan) thật cô đọng và rõ ràng ngay sau phần Introduction. Không nêu ý kiến cá nhân.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span><strong>Task 2:</strong> Phải có cấu trúc 4 phần rõ rệt (Intro, Body 1, Body 2, Conclusion). Luôn khẳng định rõ lập trường nhất quán xuyên suốt bài viết.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span>Sử dụng từ nối mạch lạc (cohesive devices) một cách tự nhiên, tránh dùng rập khuôn hoặc lạm dụng các liên từ máy móc.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: Results Dashboard or Welcome Screen (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            
            <AnimatePresence mode="wait">
              
              {/* STATE 1: LOADING */}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#F2F0EB]/50 border border-[#1C1C1C] p-8 flex flex-col items-center justify-center text-center min-h-[500px]"
                >
                  <div className="relative mb-6">
                    <div className="h-16 w-16 border-2 border-[#1C1C1C]/10 border-t-[#1C1C1C] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-[#1C1C1C] animate-pulse" />
                    </div>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#1C1C1C] mb-2">Đang chấm điểm và phân tích</h3>
                  <p className="text-xs text-[#1C1C1C]/70 max-w-sm mb-6 leading-relaxed font-serif italic">
                    Hệ thống AI đang thực hiện phân tích bài luận theo các nhóm tiêu chí của giám khảo Cambridge...
                  </p>
                  
                  {/* Active loading message */}
                  <motion.div 
                    key={loadingMessage}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F9F7F2] border border-[#1C1C1C] px-5 py-3 text-[#1C1C1C] font-semibold text-xs flex items-center gap-2"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin text-[#1C1C1C]" />
                    {loadingMessage}
                  </motion.div>
                </motion.div>
              )}

              {/* STATE 2: EVALUATION COMPLETED */}
              {!isLoading && evaluation && (
                <motion.div
                  key="evaluation"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Dashboard Header Banner */}
                  <div className="bg-[#F2F0EB] text-[#1C1C1C] border border-[#1C1C1C] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-1 text-center sm:text-left">
                      <div className="text-[10px] text-[#1C1C1C]/60 font-bold tracking-widest uppercase">Estimated IELTS Band Score</div>
                      <h2 className="font-serif italic font-bold text-2xl tracking-tight text-[#1C1C1C]">Báo cáo đánh giá chi tiết</h2>
                      <p className="text-[11px] text-[#1C1C1C]/70 font-serif">
                        Độ dài: <strong className="text-[#1C1C1C]">{evaluation.wordCount} từ</strong> | Trạng thái: <strong className={isWordCountSufficient ? "text-emerald-800" : "text-[#D97706]"}>{isWordCountSufficient ? "Đủ số lượng từ tối thiểu" : "Chưa đủ số từ tối thiểu"}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-6 bg-[#F9F7F2] border border-[#1C1C1C] px-6 py-4 shrink-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-[#1C1C1C]/60 font-bold uppercase tracking-wider">Band</span>
                        <span className="text-6xl font-serif font-bold italic leading-none mt-1 text-[#1C1C1C]">{evaluation.overallBand.toFixed(1)}</span>
                      </div>
                      <div className="h-12 w-[1px] bg-[#1C1C1C]/20"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#1C1C1C]/60 font-bold uppercase tracking-wider">Xếp loại</span>
                        <span className="text-xs font-serif font-bold italic text-[#1C1C1C] mt-1.5">{getBandDescription(evaluation.overallBand)}</span>
                        <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">Mô phỏng Cambridge</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex border-b border-[#1C1C1C] bg-[#F2F0EB] px-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('scorecard')}
                      className={`px-4 py-3 text-[10px] font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 uppercase tracking-widest cursor-pointer ${
                        activeTab === 'scorecard' 
                          ? 'border-[#1C1C1C] text-[#1C1C1C]' 
                          : 'border-transparent text-[#1C1C1C]/45 hover:text-[#1C1C1C]'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Điểm & Nhận xét
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('corrections')}
                      className={`px-4 py-3 text-[10px] font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 uppercase tracking-widest cursor-pointer ${
                        activeTab === 'corrections' 
                          ? 'border-[#1C1C1C] text-[#1C1C1C]' 
                          : 'border-transparent text-[#1C1C1C]/45 hover:text-[#1C1C1C]'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sửa lỗi câu ({evaluation.corrections.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rewrites')}
                      className={`px-4 py-3 text-[10px] font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 uppercase tracking-widest cursor-pointer ${
                        activeTab === 'rewrites' 
                          ? 'border-[#1C1C1C] text-[#1C1C1C]' 
                          : 'border-transparent text-[#1C1C1C]/45 hover:text-[#1C1C1C]'
                      }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Bài mẫu nâng band
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="bg-[#F9F7F2] border border-x border-b border-[#1C1C1C] p-6">
                    
                    {/* TAB 1: SCORECARD */}
                    {activeTab === 'scorecard' && (
                      <div className="flex flex-col gap-6">
                        
                        {/* Scorecard Sub-toggle */}
                        <div className="flex border-b border-[#1C1C1C]/15 pb-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setCriteriaFramework('ielts')}
                            className={`text-[10px] font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all cursor-pointer ${
                              criteriaFramework === 'ielts'
                                ? 'border-[#1C1C1C] text-[#1C1C1C]'
                                : 'border-transparent text-[#1C1C1C]/40 hover:text-[#1C1C1C]/80'
                            }`}
                          >
                            Báo cáo điểm chuẩn IELTS
                          </button>
                          <button
                            type="button"
                            onClick={() => setCriteriaFramework('7cat')}
                            className={`text-[10px] font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all cursor-pointer ${
                              criteriaFramework === '7cat'
                                ? 'border-[#1C1C1C] text-[#1C1C1C]'
                                : 'border-transparent text-[#1C1C1C]/40 hover:text-[#1C1C1C]/80'
                            }`}
                          >
                            Bộ 7 Tiêu chí Hàn Lâm 7-CAT
                          </button>
                        </div>

                        {criteriaFramework === 'ielts' ? (
                          /* 4 Criteria Scores */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Criterion 1 */}
                            <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                              <div className="flex justify-between items-end">
                                <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">
                                  {taskType === '1' ? 'Task Achievement (TA)' : 'Task Response (TR)'}
                                </span>
                                <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                  {evaluation.criteria.taskAchievement.score.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.criteria.taskAchievement.score / 9) * 100}%` }}></div>
                              </div>
                              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                {evaluation.criteria.taskAchievement.feedback}
                              </p>
                            </div>

                            {/* Criterion 2 */}
                            <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                              <div className="flex justify-between items-end">
                                <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">Coherence & Cohesion (CC)</span>
                                <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                  {evaluation.criteria.coherenceCohesion.score.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.criteria.coherenceCohesion.score / 9) * 100}%` }}></div>
                              </div>
                              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                {evaluation.criteria.coherenceCohesion.feedback}
                              </p>
                            </div>

                            {/* Criterion 3 */}
                            <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                              <div className="flex justify-between items-end">
                                <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">Lexical Resource (LR)</span>
                                <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                  {evaluation.criteria.lexicalResource.score.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.criteria.lexicalResource.score / 9) * 100}%` }}></div>
                              </div>
                              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                {evaluation.criteria.lexicalResource.feedback}
                              </p>
                            </div>

                            {/* Criterion 4 */}
                            <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                              <div className="flex justify-between items-end">
                                <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">Grammatical Range (GRA)</span>
                                <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                  {evaluation.criteria.grammaticalRange.score.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.criteria.grammaticalRange.score / 9) * 100}%` }}></div>
                              </div>
                              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                {evaluation.criteria.grammaticalRange.feedback}
                              </p>
                            </div>
                          </div>
                        ) : (
                          evaluation.sevenCat ? (
                            /* 7-CAT Criteria Scores */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Accuracy */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-1 Accuracy (Ý nghĩa)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.accuracy.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.accuracy.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.accuracy.feedback}
                                </p>
                              </div>

                              {/* Naturalness */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-2 Naturalness (Tự nhiên)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.naturalness.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.naturalness.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.naturalness.feedback}
                                </p>
                              </div>

                              {/* Register */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-3 Register (Văn phong)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.register.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.register.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.register.feedback}
                                </p>
                              </div>

                              {/* Terminology */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-4 Terminology (Thuật ngữ)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.terminology.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.terminology.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.terminology.feedback}
                                </p>
                              </div>

                              {/* Rhetoric */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-5 Rhetoric (Tu từ & Hedging)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.rhetoric.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.rhetoric.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.rhetoric.feedback}
                                </p>
                              </div>

                              {/* Smoothness */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-6 Smoothness (Lưu loát)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.smoothness.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.smoothness.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.smoothness.feedback}
                                </p>
                              </div>

                              {/* Tailoring */}
                              <div className="border border-[#1C1C1C]/10 p-4 flex flex-col gap-3 bg-[#F2F0EB]/20 hover:bg-[#F2F0EB]/40 transition-colors">
                                <div className="flex justify-between items-end">
                                  <span className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider">CAT-7 Tailoring (Độc giả)</span>
                                  <span className="font-serif italic text-lg font-bold text-[#1C1C1C]">
                                    {evaluation.sevenCat.tailoring.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-[#1C1C1C]/10">
                                  <div className="h-full bg-[#1C1C1C]" style={{ width: `${(evaluation.sevenCat.tailoring.score / 9) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif italic text-justify">
                                  {evaluation.sevenCat.tailoring.feedback}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 border border-dashed border-[#1C1C1C]/15 bg-[#F2F0EB]/20 font-serif">
                              <p className="text-xs italic text-[#1C1C1C]/60">Bộ phân tích 7-CAT chưa khả dụng cho bài luận cũ này.</p>
                              <p className="text-[10px] text-[#1C1C1C]/45 mt-1">Vui lòng thực hiện "Chấm điểm bài viết" lại để nhận đánh giá 7-CAT đầy đủ.</p>
                            </div>
                          )
                        )}

                        {/* Strengths & Weaknesses Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#1C1C1C] pt-6">
                          {/* Strengths */}
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1C1C]" />
                              Ưu điểm chính (Strengths)
                            </h4>
                            <ul className="flex flex-col gap-2 list-none p-0">
                              {evaluation.strengths.map((str, idx) => (
                                <li key={idx} className="text-xs text-[#1C1C1C]/80 flex items-start gap-2.5 leading-relaxed font-serif">
                                  <span className="bg-emerald-100 border-b border-emerald-500 px-1 font-bold text-emerald-800 shrink-0">✓</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Weaknesses */}
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />
                              Hạn chế chính (Weaknesses)
                            </h4>
                            <ul className="flex flex-col gap-2 list-none p-0">
                              {evaluation.weaknesses.map((weak, idx) => (
                                <li key={idx} className="text-xs text-[#1C1C1C]/80 flex items-start gap-2.5 leading-relaxed font-serif">
                                  <span className="bg-yellow-100 border-b border-yellow-600 px-1 font-bold text-yellow-800 shrink-0">•</span>
                                  <span>{weak}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Action Items List */}
                        <div className="border-t border-[#1C1C1C] pt-6 flex flex-col gap-4 bg-[#F2F0EB] -mx-6 -mb-6 p-6">
                          <h4 className="text-[11px] font-bold text-[#1C1C1C] uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-[#1C1C1C]" />
                            Khuyến nghị bứt phá điểm số (Action Items)
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {evaluation.actionItems.map((action, idx) => (
                              <div key={idx} className="flex items-start gap-3 bg-[#F9F7F2] p-4 border border-[#1C1C1C]">
                                <div className="h-6 w-6 border border-[#1C1C1C] bg-[#1C1C1C] text-[#F9F7F2] flex items-center justify-center font-bold text-xs shrink-0 font-serif">
                                  {idx + 1}
                                </div>
                                <p className="text-xs text-[#1C1C1C]/90 font-serif font-medium leading-relaxed">{action}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB 2: SENTENCE CORRECTIONS */}
                    {activeTab === 'corrections' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-3 border-b border-[#1C1C1C]">
                          <div>
                            <h4 className="font-serif italic font-bold text-lg text-[#1C1C1C]">Chi tiết sửa đổi từng câu</h4>
                            <p className="text-[11px] text-[#1C1C1C]/60 uppercase tracking-widest font-semibold mt-0.5">Grammar, Lexical and style proofreading</p>
                          </div>
                          <span className="bg-[#1C1C1C] text-[#F9F7F2] px-3 py-1 text-[10px] uppercase tracking-wider font-bold">
                            {evaluation.corrections.length} lỗi
                          </span>
                        </div>

                        {evaluation.corrections.length === 0 ? (
                          <div className="text-center py-12 text-[#1C1C1C]/50 font-serif">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                            <p className="text-sm font-medium italic">Tuyệt vời! Không phát hiện lỗi sai câu rõ ràng nào.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                            {evaluation.corrections.map((corr, idx) => (
                              <div key={idx} className="border border-[#1C1C1C]/20 p-4 flex flex-col gap-3 bg-[#F2F0EB]/30 hover:border-[#1C1C1C] transition-all">
                                <div className="flex justify-between items-center border-b border-[#1C1C1C]/10 pb-2">
                                  <span className="text-[10px] font-bold text-[#1C1C1C]/50 uppercase tracking-widest font-mono">Error #{idx + 1}</span>
                                  <span className={`text-[9px] font-bold px-2.5 py-0.5 border uppercase tracking-wider ${
                                    corr.category === 'grammar' ? 'bg-red-50 text-red-800 border-red-300' :
                                    corr.category === 'vocabulary' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                    corr.category === 'punctuation' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                    'bg-indigo-50 text-indigo-800 border-indigo-300'
                                  }`}>
                                    {corr.category === 'grammar' ? 'Ngữ pháp' :
                                     corr.category === 'vocabulary' ? 'Từ vựng' :
                                     corr.category === 'punctuation' ? 'Dấu câu' : 'Phong cách'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Original */}
                                  <div className="bg-red-50/50 border border-red-200/60 p-3.5 flex flex-col gap-1.5">
                                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest font-mono">Bản gốc</span>
                                    <p className="text-xs text-red-950 font-medium line-through decoration-red-500/50 leading-relaxed font-serif">
                                      "{corr.original}"
                                    </p>
                                  </div>

                                  {/* Corrected */}
                                  <div className="bg-emerald-50/50 border border-emerald-200/60 p-3.5 flex flex-col gap-1.5">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-mono">Chỉnh sửa đề xuất</span>
                                    <p className="text-xs text-emerald-950 font-bold leading-relaxed font-serif bg-emerald-100/35 px-1 border-b-2 border-emerald-500/40">
                                      "{corr.corrected}"
                                    </p>
                                  </div>
                                </div>

                                {/* Explanation */}
                                <div className="text-xs text-[#1C1C1C]/80 bg-[#F9F7F2] border border-[#1C1C1C]/10 p-3 flex items-start gap-2.5 leading-relaxed font-serif shadow-2xs">
                                  <HelpCircle className="h-4 w-4 text-[#1C1C1C]/40 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-[#1C1C1C]">Giải thích:</strong> {corr.explanation}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: REWRITES */}
                    {activeTab === 'rewrites' && (
                      <div className="flex flex-col gap-5">
                        
                        {/* Selector tabs */}
                        <div className="flex gap-2 bg-[#F2F0EB] p-1 border border-[#1C1C1C]/15">
                          <button
                            type="button"
                            onClick={() => setRewriteTab('original')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              rewriteTab === 'original'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2]'
                                : 'text-[#1C1C1C]/60 hover:text-[#1C1C1C]'
                            }`}
                          >
                            Bài viết gốc
                          </button>
                          <button
                            type="button"
                            onClick={() => setRewriteTab('band7')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              rewriteTab === 'band7'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2]'
                                : 'text-[#1C1C1C]/60 hover:text-[#1C1C1C]'
                            }`}
                          >
                            Bản nâng cấp (Band 7.0)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRewriteTab('band8')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              rewriteTab === 'band8'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2]'
                                : 'text-[#1C1C1C]/60 hover:text-[#1C1C1C]'
                            }`}
                          >
                            Bản tinh hoa (Band 8.5+)
                          </button>
                        </div>

                        {/* Rewrite Text Panel */}
                        <div className="border border-[#1C1C1C]/20 p-5 bg-[#F9F7F2] min-h-[300px]">
                          <AnimatePresence mode="wait">
                            
                            {rewriteTab === 'original' && (
                              <motion.div
                                key="orig"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-center border-b border-[#1C1C1C]/10 pb-2.5">
                                  <span className="text-[10px] font-bold text-[#1C1C1C]/60 uppercase tracking-widest">Bản thảo sơ khởi của bạn</span>
                                  <span className="text-[10px] bg-[#1C1C1C]/10 text-[#1C1C1C] px-2 py-0.5 font-bold font-mono">{wordCount} từ</span>
                                </div>
                                <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-serif text-justify">
                                  {essayText}
                                </p>
                              </motion.div>
                            )}

                            {rewriteTab === 'band7' && (
                              <motion.div
                                key="b7"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-center border-b border-[#1C1C1C]/10 pb-2.5">
                                  <span className="text-[10px] font-bold text-[#1C1C1C] uppercase flex items-center gap-1.5 tracking-widest">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Revised Target Essay (Band 7.0)
                                  </span>
                                  <span className="text-[10px] bg-[#1C1C1C]/10 text-[#1C1C1C] px-2 py-0.5 font-bold">Tự nhiên & Trôi chảy</span>
                                </div>
                                <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-serif font-medium text-justify">
                                  {evaluation.rewrites.band7}
                                </p>
                                <div className="bg-[#F2F0EB] p-4 border border-[#1C1C1C]/15 text-xs text-[#1C1C1C]/90 mt-3 font-serif">
                                  <strong>Mục tiêu Band 7.0:</strong> Bài luận tập trung hiệu chỉnh các lỗi ngữ pháp then chốt, củng cố tính chặt chẽ trong liên kết câu, đồng thời tinh chỉnh một số cụm từ thông thường thành ngữ pháp mang tính học thuật tự nhiên để tối ưu thang điểm Lexical Resource.
                                </div>
                              </motion.div>
                            )}

                            {rewriteTab === 'band8' && (
                              <motion.div
                                key="b8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-center border-b border-[#1C1C1C]/10 pb-2.5">
                                  <span className="text-[10px] font-bold text-[#1C1C1C] uppercase flex items-center gap-1.5 tracking-widest">
                                    <Award className="h-3.5 w-3.5" />
                                    Elite Model Essay (Band 8.5+)
                                  </span>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold">Mẫu xuất chúng</span>
                                </div>
                                <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-serif font-medium text-justify">
                                  {evaluation.rewrites.band8}
                                </p>
                                <div className="bg-[#F2F0EB] p-4 border border-[#1C1C1C]/15 text-xs text-[#1C1C1C]/90 mt-3 font-serif">
                                  <strong>Bài mẫu Band 8.5+:</strong> Bài viết thượng thừa sử dụng vốn từ vựng cao cấp, cấu trúc ngữ pháp phức hợp chuyển giao mượt mà, lập luận mang tính đa chiều sâu sắc để đạt mức điểm tối đa ở mọi tiêu chí khảo thí.
                                </div>
                              </motion.div>
                            )}

                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}

              {/* STATE 3: WELCOME SCREEN (No active evaluation) */}
              {!isLoading && !evaluation && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Overview Introduction Banner */}
                  <div className="bg-[#F9F7F2] border border-[#1C1C1C] p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#F2F0EB] p-2.5 border border-[#1C1C1C]/15">
                        <BookOpen className="h-5 w-5 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <h2 className="font-serif italic font-bold text-lg text-[#1C1C1C]">Khảo thí chuẩn IELTS Writing</h2>
                        <p className="text-[11px] text-[#1C1C1C]/60 uppercase tracking-widest font-semibold mt-0.5">IELTS Assessment Standards & Framework</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#1C1C1C]/80 leading-relaxed font-serif text-justify">
                      Chào mừng bạn đến với <strong>IELTS Writing Assistant AI</strong>. Đây là nền tảng đồng hành độc bản hỗ trợ đắc lực cho quy trình lập luận, hiệu đính và tối ưu hóa bài luận học thuật. Hệ thống được tinh chỉnh để mô phỏng chính xác khung đánh giá chuẩn Cambridge, giúp chỉ ra từng lỗ hổng tư duy và ngữ pháp chi tiết.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div className="bg-[#F2F0EB]/50 border border-[#1C1C1C]/10 p-4 flex items-start gap-3">
                        <div className="bg-[#1C1C1C] text-[#F9F7F2] h-5 w-5 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">1</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-[#1C1C1C] uppercase tracking-wider">IELTS Writing Task 1</h4>
                          <p className="text-[11px] text-[#1C1C1C]/70 mt-1 leading-relaxed font-serif text-justify">Yêu cầu mô tả khách quan thông tin từ biểu đồ (cột, đường, tròn, bản đồ, quy trình). Đòi hỏi tính cô đọng, khách quan và đạt tối thiểu 150 từ.</p>
                        </div>
                      </div>

                      <div className="bg-[#F2F0EB]/50 border border-[#1C1C1C]/10 p-4 flex items-start gap-3">
                        <div className="bg-[#1C1C1C] text-[#F9F7F2] h-5 w-5 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">2</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-[#1C1C1C] uppercase tracking-wider">IELTS Writing Task 2</h4>
                          <p className="text-[11px] text-[#1C1C1C]/70 mt-1 leading-relaxed font-serif text-justify">Yêu cầu hoàn thành một bài luận nghị luận xã hội về các chủ đề phức hợp. Đòi hỏi cấu trúc chặt chẽ, luận điểm rõ ràng và đạt tối thiểu 250 từ.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive IELTS criteria Reference Directory */}
                  <div className="bg-[#F9F7F2] border border-[#1C1C1C] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1C1C1C]/15">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-[#1C1C1C]" />
                        <h3 className="font-serif italic font-bold text-sm text-[#1C1C1C]">
                          Hệ thống tiêu chí đánh giá chất lượng (Task {taskType})
                        </h3>
                      </div>
                      <span className="text-[9px] bg-[#1C1C1C] text-[#F9F7F2] px-2 py-0.5 uppercase tracking-wider font-bold font-mono">
                        {criteriaFramework === 'ielts' ? 'IELTS Band Descriptors' : '7-CAT Quality Standard'}
                      </span>
                    </div>

                    <p className="text-xs text-[#1C1C1C]/70 leading-relaxed font-serif text-justify">
                      Bài viết học thuật chuẩn Cambridge đòi hỏi chiều sâu về ngôn ngữ và tính chính xác cao. Chuyển đổi giữa 2 hệ tiêu chuẩn đánh giá dưới đây để xem chi tiết:
                    </p>

                    {/* Framework Toggle Button Bar */}
                    <div className="flex border-b border-[#1C1C1C]/15 pb-1 gap-4">
                      <button
                        type="button"
                        onClick={() => setCriteriaFramework('ielts')}
                        className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                          criteriaFramework === 'ielts'
                            ? 'border-[#1C1C1C] text-[#1C1C1C]'
                            : 'border-transparent text-[#1C1C1C]/40 hover:text-[#1C1C1C]/80'
                        }`}
                      >
                        Tiêu chí IELTS chuẩn
                      </button>
                      <button
                        type="button"
                        onClick={() => setCriteriaFramework('7cat')}
                        className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                          criteriaFramework === '7cat'
                            ? 'border-[#1C1C1C] text-[#1C1C1C]'
                            : 'border-transparent text-[#1C1C1C]/40 hover:text-[#1C1C1C]/80'
                        }`}
                      >
                        Bộ tiêu chí 7-CAT (Chất lượng dịch & Viết học thuật)
                      </button>
                    </div>

                    {criteriaFramework === 'ielts' ? (
                      <>
                        {/* Criteria Selector Tabs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCriteriaTab('ta')}
                            className={`px-3 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selectedCriteriaTab === 'ta'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              {taskType === '1' ? 'Task Achievement' : 'Task Response'}
                            </span>
                            <span className={`text-[8px] font-mono uppercase ${selectedCriteriaTab === 'ta' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>
                              {taskType === '1' ? 'Mô tả thông tin' : 'Giải quyết luận đề'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCriteriaTab('cc')}
                            className={`px-3 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selectedCriteriaTab === 'cc'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[10px] font-bold tracking-wider uppercase">Coherence & Cohesion</span>
                            <span className={`text-[8px] font-mono uppercase ${selectedCriteriaTab === 'cc' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>
                              Mạch lạc & Liên kết
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCriteriaTab('lr')}
                            className={`px-3 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selectedCriteriaTab === 'lr'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[10px] font-bold tracking-wider uppercase">Lexical Resource</span>
                            <span className={`text-[8px] font-mono uppercase ${selectedCriteriaTab === 'lr' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>
                              Vốn từ vựng rộng
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCriteriaTab('gra')}
                            className={`px-3 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selectedCriteriaTab === 'gra'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[10px] font-bold tracking-wider uppercase">Grammar Range</span>
                            <span className={`text-[8px] font-mono uppercase ${selectedCriteriaTab === 'gra' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>
                              Ngữ pháp & Độ chuẩn
                            </span>
                          </button>
                        </div>

                        {/* Criteria Tab Content Card */}
                        <div className="bg-[#F2F0EB]/40 border border-[#1C1C1C]/15 p-4 flex flex-col gap-3.5">
                          {selectedCriteriaTab === 'ta' && (
                            <>
                              <div className="flex flex-col gap-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">
                                  {taskType === '1' ? 'Task Achievement (TA)' : 'Task Response (TR)'}
                                </h4>
                                <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                  {taskType === '1' 
                                    ? 'Đánh giá khả năng mô tả và báo cáo thông tin khách quan, chính xác từ biểu đồ/quy trình, hoàn thành yêu cầu tối thiểu 150 từ, và đặc biệt là sự hiện diện của đoạn tóm tắt tổng quan (Overview) rõ nét không có số liệu rời rạc.' 
                                    : 'Đánh giá mức độ trả lời đầy đủ tất cả các phần của đề bài nghị luận, duy trì lập trường nhất quán xuyên suốt, trình bày luận điểm rõ ràng, có phân tích mở rộng và dẫn chứng hỗ trợ, đạt tối thiểu 250 từ.'}
                                </p>
                              </div>
                              
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>

                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300">Band 8.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    {taskType === '1'
                                      ? 'Khái quát xuất sắc toàn bộ xu hướng hoặc giai đoạn chính. Đầy đủ so sánh dữ liệu then chốt cực kỳ chuẩn xác.'
                                      : 'Giải quyết toàn diện mọi khía cạnh của luận đề. Lập trường cực kỳ vững chắc, nhất quán; luận điểm phát triển sâu sắc.'}
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-950 border border-amber-300">Band 7.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    {taskType === '1'
                                      ? 'Bắt buộc có Overview rõ ràng. Chỉ ra các đặc điểm nổi bật một cách logic và có so sánh tương quan.'
                                      : 'Trả lời trực diện tất cả câu hỏi trong đề. Giữ vững lập trường từ đầu đến cuối; các luận điểm có phát triển.'}
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 text-rose-950 border border-rose-300">Band 6.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    {taskType === '1'
                                      ? 'Có Overview nhưng thông tin tóm lược còn sơ sài hoặc sai lệch nhỏ. Chưa làm nổi bật tính so sánh dữ liệu.'
                                      : 'Trả lời đủ nhưng có phần sơ sài hơn phần khác. Lập trường nhìn chung rõ nhưng kết luận đôi khi lặp ý.'}
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-400">Band 5.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90 border-l-2 border-amber-500 pl-2">
                                    {taskType === '1'
                                      ? 'Không có Overview, hoặc chỉ lặp lại đề bài một cách cơ học. Bài viết bị phạt vì liệt kê số liệu rời rạc.'
                                      : 'Chỉ giải quyết được một phần đề bài. Lập trường mơ hồ hoặc mâu thuẫn. Các luận điểm cực kỳ sơ sài, lạc đề.'}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {selectedCriteriaTab === 'cc' && (
                            <>
                              <div className="flex flex-col gap-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">Coherence and Cohesion (CC)</h4>
                                <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                  Đánh giá tính mạch lạc, trình tự sắp xếp ý tưởng hợp lý, việc phân đoạn văn (paragraphing) chuẩn chỉnh và cách sử dụng linh hoạt các liên từ (linking words) một cách tự nhiên để kết nối các câu và các đoạn văn.
                                </p>
                              </div>

                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>

                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300">Band 8.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Sắp xếp thông tin vô cùng logic. Phân đoạn văn hoàn mỹ. Sử dụng từ liên kết tinh tế, mượt mà và tự nhiên không tì vết.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-950 border border-amber-300">Band 7.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Trình bày ý tưởng có trình tự logic rõ rệt. Chia các đoạn văn hợp lý (mỗi đoạn 1 ý chính). Từ nối đa dạng tuy đôi khi lặp.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 text-rose-950 border border-rose-300">Band 6.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Bố cục tương đối rõ ràng nhưng phân đoạn văn chưa tối ưu. Liên từ dùng đầy đủ nhưng còn máy móc, rập khuôn ở đầu câu.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-400">Band 5.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90 border-l-2 border-amber-500 pl-2">
                                    Thiếu tính liên kết câu trầm trọng. Viết liên tục không chia đoạn văn (hoặc chia đoạn tùy tiện). Lạm dụng lặp từ nối thô kệch.
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {selectedCriteriaTab === 'lr' && (
                            <>
                              <div className="flex flex-col gap-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">Lexical Resource (LR)</h4>
                                <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                  Đánh giá độ rộng và chiều sâu của vốn từ vựng được sử dụng, độ chính xác trong ngữ cảnh xã hội/học thuật, cách kết hợp từ tự nhiên (collocations), độ chính xác của chính tả và cấu tạo từ (word formation).
                                </p>
                              </div>

                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>

                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300">Band 8.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Vốn từ vựng vô cùng phong phú và tự nhiên. Sử dụng thuần thục các collocations nâng cao. Lỗi chính tả cực kỳ hiếm hoi.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-950 border border-amber-300">Band 7.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Sử dụng linh hoạt các từ vựng học thuật ít phổ biến. Có hiểu biết tốt về collocations. Có thể mắc vài lỗi nhỏ không ảnh hưởng truyền đạt.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 text-rose-950 border border-rose-300">Band 6.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Vốn từ đủ dùng cho chủ đề. Có cố gắng dùng từ nâng cao nhưng còn gượng ép hoặc chưa đúng ngữ cảnh. Mắc một vài lỗi chính tả.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-400">Band 5.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90 border-l-2 border-amber-500 pl-2">
                                    Từ vựng rất hạn chế, lặp từ sơ đẳng liên tục. Lỗi chính tả và lựa chọn từ nghiêm trọng gây khó hiểu cho người đọc.
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {selectedCriteriaTab === 'gra' && (
                            <>
                              <div className="flex flex-col gap-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">Grammatical Range and Accuracy (GRA)</h4>
                                <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                  Đánh giá độ đa dạng cấu trúc ngữ pháp (câu đơn, câu phức, câu ghép, câu bị động, câu điều kiện, mệnh đề quan hệ...) và tỷ lệ các câu hoàn toàn không có lỗi sai (error-free sentences rate).
                                </p>
                              </div>

                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>

                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300">Band 8.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Hầu hết các câu phức tạp được viết linh hoạt và chính xác tuyệt đối. Trên 80% số câu hoàn toàn không có lỗi ngữ pháp/dấu câu.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-950 border border-amber-300">Band 7.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Sử dụng linh hoạt many loại cấu trúc câu phức hợp. Kiểm soát ngữ pháp tốt với ít nhất 50% số câu trong bài hoàn hảo không lỗi.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 text-rose-950 border border-rose-300">Band 6.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90">
                                    Có kết hợp câu đơn và câu phức. Mắc một vài lỗi ngữ pháp hoặc dấu câu nhưng không cản trở việc thấu hiểu đại ý.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-400">Band 5.0</span>
                                  <p className="text-[11px] font-serif text-[#1C1C1C]/90 border-l-2 border-amber-500 pl-2">
                                    Chủ yếu viết câu đơn. Mắc lỗi sai cấu trúc câu nghiêm trọng tại các câu phức, làm bài luận trở nên rời rạc, khó hiểu.
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 7-CAT Selector Tabs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat1')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat1'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-1 Accuracy</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat1' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Chính xác ý</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat2')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat2'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-2 Natural</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat2' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Kết hợp từ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat3')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat3'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-3 Register</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat3' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Văn phong</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat4')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat4'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-4 Terminology</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat4' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Thuật ngữ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat5')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat5'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-5 Rhetoric</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat5' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Bảo toàn tu từ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat6')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat6'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-6 Smoothness</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat6' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Trôi chảy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelected7CatTab('cat7')}
                            className={`px-1.5 py-2 text-left border flex flex-col gap-0.5 cursor-pointer transition-all ${
                              selected7CatTab === 'cat7'
                                ? 'bg-[#1C1C1C] text-[#F9F7F2] border-[#1C1C1C]'
                                : 'bg-[#F2F0EB]/40 text-[#1C1C1C] border-[#1C1C1C]/15 hover:border-[#1C1C1C]'
                            }`}
                          >
                            <span className="text-[9px] font-bold tracking-wider uppercase">CAT-7 Tailor</span>
                            <span className={`text-[7.5px] font-mono uppercase ${selected7CatTab === 'cat7' ? 'text-[#F2F0EB]/60' : 'text-[#1C1C1C]/50'}`}>Độc giả đích</span>
                          </button>
                        </div>

                        {/* 7-CAT Tab Content Card */}
                        <div className="bg-[#F2F0EB]/40 border border-[#1C1C1C]/15 p-4 flex flex-col gap-3.5">
                          {selected7CatTab === 'cat1' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-1 Accuracy (Độ chính xác ý nghĩa)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Đảm bảo dịch và diễn đạt trọn vẹn ý nghĩa của đề bài học thuật từ tư duy sang tiếng Anh mà không bị mất mát nội dung hoặc bóp méo ngữ nghĩa.
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Undertranslation:</strong> Bản dịch/diễn đạt bị yếu hơn bản gốc về cường độ hoặc hàm ý logic.</li>
                                <li><strong>Overtranslation:</strong> Thêm thắt các chi tiết mang tính phỏng đoán, vô căn cứ không có trong đề bài hoặc dữ liệu gốc.</li>
                                <li><strong>Sai lệch tầng nghĩa:</strong> Diễn đạt đúng nghĩa đen từng từ nhưng truyền tải sai hoàn toàn bản chất hoặc hàm ý của luận điểm.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat2' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-2 Collocation & Naturalness (Kết hợp từ tự nhiên)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Sử dụng từ vựng kết hợp tự nhiên (Idiomatic collocations) đúng thói quen của người bản xứ. Tránh lối diễn đạt dịch từng từ một cách máy móc từ tiếng Việt.
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Collocation chuẩn mực:</strong> Người bản xứ sử dụng cặp từ này một cách tự nhiên trong văn bản học thuật (ví dụ: "mitigate climate change" thay vì "reduce climate change").</li>
                                <li><strong>Tránh Việt hóa cơ học:</strong> Loại bỏ các lối viết gượng gạo mô phỏng cấu trúc tiếng Việt (e.g., "play a role of" -&gt; "play a role in").</li>
                                <li><strong>Sự lưu loát tự nhiên:</strong> Từ ngữ dung hòa hoàn hảo vào dòng chảy lập luận một cách tinh tế.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat3' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-3 Register & Style (Văn phong & Ngữ điệu)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Duy trì văn phong học thuật chính quy, khách quan, trang trọng (Academic and formal register) và nhất quán từ đầu đến cuối bài luận.
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Trang trọng nhất quán:</strong> Tuyệt đối không dùng tiếng lóng, khẩu ngữ (e.g., "cool", "kids") hay từ viết tắt (e.g., "don't", "won't", "can't").</li>
                                <li><strong>Tránh đại từ nhân xưng phiến diện:</strong> Hạn chế lạm dụng "I", "you", "we" trong bài luận nghị luận học thuật trừ khi yêu cầu nêu ý kiến cá nhân.</li>
                                <li><strong>Lập luận khách quan:</strong> Giọng điệu của một nhà nghiên cứu chuẩn mực, tránh cảm xúc hóa cực đoan.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat4' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-4 Sub-language & Terminology (Thuật ngữ chuyên môn)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Sử dụng chính xác các thuật ngữ chuyên ngành tương ứng với chủ đề bài học viết để thể hiện chiều sâu tri thức.
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Từ điển chuyên ngành:</strong> Không dùng từ phổ thông chung chung khi đã có thuật ngữ kỹ thuật chuyên sâu (ví dụ: "sustainable development" thay vì "good development").</li>
                                <li><strong>Chính xác tuyệt đối:</strong> Hiểu rõ bản chất thuật ngữ trước khi áp dụng, tránh râu ông nọ cắm cằm bà kia gây mơ hồ.</li>
                                <li><strong>Nhất quán thuật ngữ:</strong> Đảm bảo các khái niệm cốt lõi được sử dụng đồng bộ và chuẩn xác suốt bài.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat5' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-5 Rhetorical Preservation (Bảo toàn tu từ & Trọng tâm)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Giữ vững các thủ pháp tu từ học thuật, nhịp lập luận (rhythm) và đặc biệt là nghệ thuật rào đón lập luận (Hedging language).
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Hedging Language:</strong> Sử dụng khéo léo các từ hạn chế mức độ khẳng định để bài viết mang tính học thuật cao (ví dụ: "this tends to trigger...", "could arguably be defined as...", "appears to reflect...").</li>
                                <li><strong>Cân bằng nhịp điệu:</strong> Biết kết hợp câu ngắn sắc bén để nhấn mạnh ý chính và câu phức nhiều mệnh đề để trình bày lập luận sâu sắc.</li>
                                <li><strong>Tránh đơn giản hóa quá đà:</strong> Không tước đoạt các sắc thái ý nghĩa hoặc lập trường tinh tế có chủ đích của mạch văn.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat6' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-6 Smoothness & Fluency (Lưu loát & Cấu trúc mạch lạc)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Độ trôi chảy, cách tổ chức câu và liên kết các mệnh đề một cách mượt mà không bị vấp hay nặng nề cấu trúc.
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Chủ động hóa tự nhiên (De-passivization):</strong> Tiếng Anh dùng bị động rất nhiều, nhưng lạm dụng bị động kép hay bị động cồng kềnh sẽ làm nặng nề bài luận. Cần chủ động hóa khéo léo.</li>
                                <li><strong>Tránh lặp cấu trúc câu đầu:</strong> Tránh mở đầu 3 câu liên tiếp bằng cùng một trạng từ nối hoặc cùng một cấu trúc "It is...".</li>
                                <li><strong>Liên từ mượt mà:</strong> Từ nối (linking words) đan cài tự nhiên vào giữa câu thay vì chỉ đứng khô khan ở đầu câu.</li>
                              </ul>
                            </div>
                          )}

                          {selected7CatTab === 'cat7' && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1C]">CAT-7 Tailoring (Thích ứng độc giả)</h4>
                              <p className="text-xs text-[#1C1C1C]/80 font-serif leading-relaxed text-justify">
                                Tinh chỉnh từ ngữ, luận điểm và bố cục bài viết sao cho đáp ứng hoàn hảo kỳ vọng của đối tượng độc giả đích (ở đây là các Giám khảo học thuật IELTS).
                              </p>
                              <div className="h-[1px] bg-[#1C1C1C]/10 my-1"></div>
                              <ul className="text-[11px] font-serif text-[#1C1C1C]/90 list-disc pl-4 flex flex-col gap-1.5">
                                <li><strong>Đúng định hướng:</strong> Viết đúng trọng tâm câu hỏi, không lan man bàn luận sang vấn đề bên lề.</li>
                                <li><strong>Đủ độ dài tiêu chuẩn:</strong> Luôn vượt mốc 150 từ (Task 1) và 250 từ (Task 2) để đảm bảo có đủ không gian phát triển ý đầy đủ nhất.</li>
                                <li><strong>Sự hài hòa văn hóa:</strong> Sử dụng ví dụ và tư duy lập luận rõ ràng, văn minh theo quy chuẩn tranh biện quốc tế.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* History of previous essays */}
                  <div className="bg-[#F9F7F2] border border-[#1C1C1C] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1C1C1C]/15">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-[#1C1C1C]" />
                        <h3 className="font-serif italic font-bold text-sm text-[#1C1C1C]">Lịch sử rèn luyện ({history.length})</h3>
                      </div>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if(confirm("Bạn có chắc chắn muốn xoá toàn bộ lịch sử chấm bài không?")) {
                              setHistory([]);
                              localStorage.removeItem("ielts_history");
                            }
                          }}
                          className="text-[10px] font-bold text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Xoá lịch sử
                        </button>
                      )}
                    </div>

                    {history.length === 0 ? (
                      <div className="text-center py-12 text-[#1C1C1C]/40 border border-dashed border-[#1C1C1C]/25 bg-[#F2F0EB]/30 font-serif">
                        <PenTool className="h-6 w-6 text-[#1C1C1C]/30 mx-auto mb-2" />
                        <p className="text-xs italic">Chưa có bài viết nào được lưu trữ. Hãy chấm bài luận đầu tiên bên trái.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => loadHistoryItem(item)}
                            className="bg-[#F2F0EB]/30 border border-[#1C1C1C]/15 p-4 flex justify-between items-center hover:bg-[#F2F0EB] hover:border-[#1C1C1C] cursor-pointer transition-all"
                          >
                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 border ${
                                  item.taskType === '1' 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                    : 'bg-indigo-50 text-indigo-900 border-indigo-300'
                                }`}>
                                  TASK {item.taskType}
                                </span>
                                <span className="text-[10px] text-[#1C1C1C]/40 font-semibold font-mono">{item.timestamp}</span>
                              </div>
                              <h4 className="text-xs font-serif font-bold text-[#1C1C1C] truncate leading-snug mt-1.5">
                                {item.promptText}
                              </h4>
                              <p className="text-[11px] text-[#1C1C1C]/60 truncate font-serif italic">
                                {item.essayText}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex flex-col items-center justify-center h-11 w-11 border border-[#1C1C1C] bg-[#F9F7F2]">
                                <span className="text-[8px] font-bold text-[#1C1C1C]/50 uppercase leading-none">BAND</span>
                                <span className="text-sm font-serif font-bold italic text-[#1C1C1C] leading-none mt-1">
                                  {item.evaluation.overallBand.toFixed(1)}
                                </span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={(e) => deleteHistoryItem(item.id, e)}
                                className="p-1.5 text-[#1C1C1C]/40 hover:text-red-700 transition-colors"
                                title="Xoá bài"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>
      </main>

      <footer className="border-t border-[#1C1C1C]/15 bg-[#F9F7F2] py-8 px-6 mt-16 text-center text-xs text-[#1C1C1C]/60 font-serif">
        <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
          <p className="font-bold text-[#1C1C1C]">IELTS Writing Assistant AI • Editorial Aesthetic</p>
          <p className="italic">Ứng dụng tự động chấm điểm chuẩn hóa theo các tiêu chí Band Descriptors được ban hành chính thức.</p>
        </div>
      </footer>
    </div>
  );
}
