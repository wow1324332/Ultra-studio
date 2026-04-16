import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, Shield, Zap, Target, Download, RotateCcw, Crosshair, Pencil, Terminal, Plus, X, ChevronDown, Layers, Lock, Unlock, XCircle, Trash2, Info, Cloud, ImagePlus, Activity, Smartphone, MonitorSmartphone, MousePointer2, MoreVertical, PlusSquare, History, ZoomIn, Maximize2, Cpu, Eye, ScanLine, Atom } from 'lucide-react';

// --- 클라우드 데이터 저장소 (Firebase) 초기화 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

let app, auth, db;
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
if (firebaseConfigStr) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("클라우드 초기화 실패:", e);
  }
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ultra-studio-app';

const defaultPrompt = "첨부된 모든 피규어 이미지들을 하나의 고급스러운 어두운색 배경지 스튜디오 장면에 자연스럽게 배치하여 합성해줘. 배경만 바꾸고 피규어들의 원래 모습, 비율, 시점은 절대 변경하지 마. 여러 피사체가 조화롭게 배치되도록 구성해줘. 추가 영역 생성 금지. 흰색 바닥 금지.";
const defaultPresets = [
  { id: 'dark', label: '다크 스튜디오', prompt: defaultPrompt },
  { id: 'nebula', label: 'M78 성운', prompt: "첨부된 모든 피규어 이미지들을 별과 빛이 가득한 신비로운 우주 공간(M78 성운) 장면에 합성해줘. 각 피규어에 은은한 우주 빛이 반사되도록 연출해줘. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." },
  { id: 'cyber', label: '사이버 격납고', prompt: "피규어들을 네온사인이 빛나는 근미래 사이버펑크 스타일의 어두운 메카닉 격납고에 있는 것처럼 합성해줘. 피규어들에 네온 조명 효과 추가. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." },
  { id: 'battle', label: '전장의 폭발', prompt: "피규어들 뒤로 거대한 불꽃과 흙먼지가 피어오르는 전장의 폭발 배경을 합성해줘. 드라마틱한 역광 조명과 파편 효과 추가. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." }
];

// --- 울트라 이미지 뷰어 컴포넌트 ---
const UltraImageViewer = ({ src, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const [lastDist, setLastDist] = useState(0);
  const imgRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouch({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setLastDist(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const x = e.touches[0].clientX - lastTouch.x;
      const y = e.touches[0].clientY - lastTouch.y;
      setPosition({ x, y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastDist > 0) {
        const delta = dist / lastDist;
        setScale(Math.max(1, Math.min(scale * delta, 5)));
      }
      setLastDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastDist(0);
  };

  const handleWheel = (e) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(Math.max(1, Math.min(scale * delta, 5)));
  };

  const handleBackdropClick = (e) => {
    if (overlayRef.current === e.target) onClose();
  };

  return (
    <div 
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 touch-none select-none"
    >
      <div 
        className="relative bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl h-full max-h-[85vh] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onWheel={handleWheel}
      >
        <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.5)]">
              <Maximize2 size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Ultra Viewer</h3>
              <p className="text-rose-400 text-[9px] font-mono tracking-widest uppercase">Ratio: {Math.round(scale * 100)}%</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-800 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-all border border-slate-700 shadow-xl">
            <X size={18} />
          </button>
        </div>

        <div 
          className="flex-grow w-full flex items-center justify-center overflow-hidden cursor-move bg-black/40"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            ref={imgRef}
            src={src} 
            alt="Enlarged view" 
            className="max-h-[95%] max-w-[95%] object-contain transition-transform duration-75 select-none pointer-events-none"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            draggable={false}
          />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-800/90 border border-slate-700/50 rounded-full backdrop-blur-md flex items-center gap-3 shadow-2xl z-10">
          <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="text-slate-400 hover:text-white transition-colors" title="Reset View">
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-3 bg-slate-700"></div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">Pinch to Zoom / Drag to Pan</p>
        </div>
      </div>
    </div>
  );
};

// --- 설치 가이드 모달 컴포넌트 ---
const InstallGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    { icon: <Smartphone className="text-rose-500" />, text: "공유 링크를 복사하여 'Chrome(크롬)' 브라우저 주소창에 붙여넣기 후 이동하세요." },
    { icon: <MousePointer2 className="text-cyan-400" />, text: "앱 화면 하단의 [제미나이 캔버스 사용하기] 버튼을 누르세요." },
    { icon: <MoreVertical className="text-slate-400" />, text: "크롬 브라우저 우측 상단의 [점 3개(메뉴)] 아이콘을 누르세요." },
    { icon: <PlusSquare className="text-rose-500" />, text: "[홈 화면에 추가] 항목을 선택하세요." },
    { icon: <Zap className="text-cyan-400" />, text: "팝업이 뜨면 [설치] 버튼을 누르세요." },
    { icon: <Pencil className="text-slate-200" />, text: "앱 이름을 확인하고 마지막 [설치]를 누르면 완료됩니다!" }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-800/50 to-transparent">
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="text-rose-500" size={24} />
            <h3 className="font-black text-white uppercase tracking-widest text-lg">Mobile Installation Guide</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-8 text-center bg-slate-800/50 py-2 rounded-full">
            전용 앱처럼 바탕화면에 설치하는 방법
          </p>
          
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-rose-500/50 transition-colors shadow-lg">
                    {step.icon}
                  </div>
                  {idx !== steps.length - 1 && <div className="w-px h-8 bg-slate-800 mt-2"></div>}
                </div>
                <div className="flex-grow pt-1">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Step 0{idx + 1}</span>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium break-keep">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 rounded-2xl bg-cyan-900/20 border border-cyan-500/30 flex items-start gap-3">
            <Info className="text-cyan-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[11px] text-cyan-200 leading-normal">
              설치가 완료되면 스마트폰 홈 화면(바탕화면)에 '울트라 스튜디오' 아이콘이 생성됩니다. 이제 브라우저를 켜지 않고도 바로 실행할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-800/30 border-t border-slate-800">
          <button onClick={onClose} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95">
            가이드 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 인트로 컴포넌트 ---
const IntroSequence = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const s1 = setTimeout(() => setStep(1), 500);
    const s2 = setTimeout(() => setStep(2), 2000);
    const s3 = setTimeout(() => setStep(3), 4500);
    const s4 = setTimeout(() => setStep(4), 6000);
    const s5 = setTimeout(() => onComplete(), 7000);

    return () => {
      clearTimeout(s1); clearTimeout(s2); clearTimeout(s3); clearTimeout(s4); clearTimeout(s5);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050505] overflow-hidden transition-all duration-1000 cursor-pointer select-none
        ${step >= 4 ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'}
      `}
      onClick={onComplete}
    >
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>
      
      <div className={`absolute top-1/4 text-center z-20 transition-all duration-1000 ${step === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-2">Project: TIGA Synthesis</p>
        <p className="text-slate-700 font-mono text-[8px] uppercase tracking-widest">Initializing Light Protocol</p>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1500 ease-out 
        ${step >= 2 ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-xl scale-95'}
        ${step >= 4 ? 'scale-110' : ''}
      `}>
        <div 
          className="relative w-full max-w-4xl aspect-[21/9] md:aspect-video overflow-hidden flex items-center justify-center"
          style={{ 
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 75%)',
            WebkitMaskImage: '-webkit-radial-gradient(center, ellipse cover, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 75%)'
          }}
        >
          <img 
            src="wp12456711.jpg" 
            alt="Ultraman Tiga" 
            className={`w-full h-full object-cover object-[center_20%] opacity-80 mix-blend-screen transition-transform duration-[10000ms] ease-out
              ${step >= 2 ? 'scale-110' : 'scale-100'}
            `}
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1200";
            }}
          />
        </div>
      </div>

      <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 transition-all duration-1000 delay-300
        ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}>
        <div className="bg-black/60 backdrop-blur-md px-12 py-8 rounded-3xl border border-white/10 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 tracking-tighter uppercase italic drop-shadow-2xl mb-2">
            ULTRA <span className="text-rose-600">STUDIO</span>
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-rose-600 to-transparent my-4"></div>
          <p className="text-slate-300 text-xs font-bold tracking-[0.3em] uppercase drop-shadow-md">Figure Synthesis Protocol</p>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 text-slate-600 text-[10px] uppercase tracking-widest hover:text-white transition-colors z-30">
        Click anywhere to skip
      </div>
    </div>
  );
};

// --- 보안 인증 화면 ---
const AuthScreen = ({ onUnlock }) => {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleChange = (e) => {
    if (success) return;
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPwd(val);
    
    if (val === '1324') {
      setSuccess(true);
      setError(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
      setTimeout(onUnlock, 1500);
    } else if (val.length === 4) {
      setError(true);
      setTimeout(() => {
        setError(false);
        setPwd("");
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#050505] text-white animate-in fade-in duration-1000 select-none">
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>
      
      <div className={`relative z-10 p-10 rounded-[2rem] border ${error ? 'border-rose-500 shadow-[0_0_40px_rgba(225,29,72,0.6)] animate-[shake_0.4s_ease-in-out]' : success ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.5)]' : 'border-slate-800 shadow-2xl'} bg-black/60 backdrop-blur-xl flex flex-col items-center transition-all duration-300 min-w-[320px]`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${success ? 'bg-cyan-900/40 text-cyan-400' : error ? 'bg-rose-900/40 text-rose-500' : 'bg-slate-800/50 text-slate-400'}`}>
          {success ? <Unlock size={32} /> : <Lock size={32} />}
        </div>
        
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 text-center">
          M78 Security
        </h2>
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-10">Restricted Protocol Access</p>
        
        <input 
          ref={inputRef}
          type="password"
          value={pwd}
          onChange={handleChange}
          inputMode="numeric"
          className={`bg-transparent border-b-2 outline-none text-center text-4xl tracking-[0.5em] font-mono w-48 py-2 transition-colors duration-300 select-text
            ${success ? 'border-cyan-400 text-cyan-300' : error ? 'border-rose-500 text-rose-400' : 'border-slate-600 focus:border-cyan-500 text-white'}
          `}
          placeholder="••••"
        />
        
        <div className="mt-8 h-4">
          {error && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Access Denied</span>}
          {success && <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Access Granted</span>}
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-15px); }
          40% { transform: translateX(15px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
};

// --- 메인 앱 컴포넌트 ---
const App = () => {
  const [appState, setAppState] = useState('intro');
  const [user, setUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [targets, setTargets] = useState([]); 
  const MAX_TARGETS = 10;
  
  const [resultImage, setResultImage] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [history, setHistory] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasEdited, setHasEdited] = useState(false);
  
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presets, setPresets] = useState(defaultPresets);

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetPrompt, setNewPresetPrompt] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [showMinPresetAlert, setShowMinPresetAlert] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filename, setFilename] = useState("ultra_studio_synthesis");
  const [showToast, setShowToast] = useState(false);
  
  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const presetsContainerRef = useRef(null);

  // --- API 키 주입 위치 ---
  const apiKey = "AQ.Ab8RN6JPQRB12h0JSbhXKsSEeQc0Pdy93tKrUjBYLqSRR2GbiA";

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("클라우드 접속 에러:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    setIsCloudSyncing(true);
    const presetDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets');
    const unsubscribe = onSnapshot(presetDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setPresets(docSnap.data().items);
      } else {
        setPresets(defaultPresets);
      }
      setIsCloudSyncing(false);
    }, (error) => {
      console.error("클라우드 데이터 읽기 에러:", error);
      setIsCloudSyncing(false);
    });
    return () => unsubscribe();
  }, [user]);

  const savePresetsToCloud = async (newPresets) => {
    setPresets(newPresets); 
    if (!user || !db) return;
    setIsCloudSyncing(true);
    try {
      const presetDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets');
      await setDoc(presetDocRef, { items: newPresets });
    } catch (e) {
      console.error("프리셋 클라우드 저장 실패:", e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (targets.length + files.length > MAX_TARGETS) {
      setError(`최대 ${MAX_TARGETS}개의 이미지만 등록할 수 있습니다.`);
      return;
    }
    const newTargetsPromises = files.map(file => {
      return new Promise((resolve) => {
        if (file.size > 10 * 1024 * 1024) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            url: reader.result,
            base64: reader.result.split(',')[1]
          });
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newTargetsPromises).then(results => {
      const validTargets = results.filter(r => r !== null);
      setTargets(prev => [...prev, ...validTargets]);
      setResultImage(null);
      setHistory([]);
      setHasEdited(false);
      e.target.value = null; 
    });
  };

  const removeTarget = (indexToRemove) => {
    if (isLoading) return;
    setTargets(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setResultImage(null);
    setHistory([]);
    setHasEdited(false);
  };

  const clearAllTargets = () => {
    if (isLoading) return;
    setTargets([]);
    setResultImage(null);
    setHistory([]);
    setHasEdited(false);
  };

  const cancelableSleep = (ms, signal) => new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });

  const editImageWithRetry = async (currentPrompt, retryCount = 0) => {
    try {
      if (isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      const imageParts = targets.map(t => ({
        inlineData: { mimeType: "image/png", data: t.base64 }
      }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }, ...imageParts] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
          }),
          signal: abortControllerRef.current?.signal 
        }
      );
      if (isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      if (!response.ok) throw new Error(`통신 오류: ${response.status}`);
      const result = await response.json();
      const generatedBase64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (generatedBase64) {
        const newImg = `data:image/png;base64,${generatedBase64}`;
        setResultImage(newImg);
        setHistory(prev => [newImg, ...prev]); 
        setHasEdited(true);
      } else {
        throw new Error("이미지 생성 실패");
      }
    } catch (err) {
      if (err.name === 'AbortError' || isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000;
        await cancelableSleep(delay, abortControllerRef.current?.signal);
        return editImageWithRetry(currentPrompt, retryCount + 1);
      }
      throw err;
    }
  };

  const handleStartEditing = async (overridePrompt = null) => {
    if (targets.length === 0) return;
    isCancelledRef.current = false;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsPresetsOpen(false);
    setIsSaving(false); 
    const finalPrompt = overridePrompt || prompt;
    try {
      await editImageWithRetry(finalPrompt);
    } catch (err) {
      if (err.name !== 'AbortError' && !isCancelledRef.current) {
        setError("합성에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      if (!isCancelledRef.current) setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelSynthesis = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsLoading(false);
  };

  const handlePresetClick = (presetPrompt) => {
    setPrompt(presetPrompt);
    setIsPresetsOpen(false);
    if (targets.length > 0 && !isLoading) handleStartEditing(presetPrompt);
  };

  const handleOpenAddPresetModal = () => {
    setEditingPresetId(null);
    setNewPresetLabel("");
    setNewPresetPrompt("");
    setShowPresetModal(true);
  };

  const handleOpenEditPresetModal = (e, preset) => {
    e.stopPropagation(); 
    setEditingPresetId(preset.id);
    setNewPresetLabel(preset.label);
    setNewPresetPrompt(preset.prompt);
    setShowPresetModal(true);
  };

  const handleDeletePresetClick = (e, preset) => {
    e.stopPropagation();
    if (presets.length <= 1) {
      setShowMinPresetAlert(true);
      return;
    }
    setPresetToDelete(preset);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePreset = () => {
    if (presetToDelete) {
      const newPresets = presets.filter(p => p.id !== presetToDelete.id);
      savePresetsToCloud(newPresets);
      setShowDeleteConfirm(false);
      setPresetToDelete(null);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetLabel.trim() || !newPresetPrompt.trim()) return;
    let newPresets;
    if (editingPresetId) {
      newPresets = presets.map(p => p.id === editingPresetId ? { ...p, label: newPresetLabel.trim(), prompt: newPresetPrompt.trim() } : p);
    } else {
      newPresets = [...presets, { id: `custom-${Date.now()}`, label: newPresetLabel.trim(), prompt: newPresetPrompt.trim() }];
    }
    savePresetsToCloud(newPresets);
    setShowPresetModal(false);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `${filename || 'ultra_studio'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const togglePresetsMenu = () => {
    const willOpen = !isPresetsOpen;
    setIsPresetsOpen(willOpen);
    if (willOpen) {
      setTimeout(() => {
        if (presetsContainerRef.current) {
          const y = presetsContainerRef.current.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  if (appState === 'intro') return <IntroSequence onComplete={() => setAppState('auth')} />;
  if (appState === 'auth') return <AuthScreen onUnlock={() => setAppState('main')} />;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans selection:bg-rose-500 selection:text-white animate-in fade-in duration-1000 select-none">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-25 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-600 rounded-full blur-[140px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600 rounded-full blur-[120px] opacity-30"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10 pt-4 md:pt-8">
        <header className="mb-10 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-4">
             <div className="flex-1"></div>
             <div className="inline-flex items-center gap-2 px-4 py-1 bg-rose-600/20 border border-rose-600/50 text-rose-400 text-[10px] md:text-xs font-bold tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(225,29,72,0.2)] backdrop-blur-sm">
                <Shield size={14} /> M78 Nebula Spec-Ops
             </div>
             <div className="flex-1 flex justify-end">
                <button onClick={() => setShowInstallGuide(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-all hover:scale-110 active:scale-90 shadow-lg">
                  <Smartphone size={18} />
                </button>
             </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-6 tracking-tighter uppercase italic drop-shadow-2xl text-center">
            ULTRA <span className="text-rose-600">STUDIO</span>
          </h1>
          
          <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-2 text-center">
            <p className="text-slate-300 text-sm md:text-lg font-medium leading-relaxed break-keep">
              과학특수대의 기술력을 집약하여 <span className="text-white font-bold">피규어 배경을 완벽하게 합성합니다.</span>
            </p>
            {user && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-500/30">
                {isCloudSyncing ? <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> : <Cloud size={12} />}
                <span className="font-mono tracking-widest uppercase">{isCloudSyncing ? 'Cloud Syncing...' : 'Cloud Synced'}</span>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-rose-500/10 border border-rose-500/50 rounded-2xl p-4 flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-6 mb-12 relative z-20">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl group relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0 overflow-hidden">
              <div className="flex flex-col gap-1 border-l-4 border-rose-600 pl-3 min-w-0">
                <div className="flex items-center gap-2">
                  <Target className="text-rose-600 shrink-0" size={20} />
                  <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200 truncate">1. Target Scan</h3>
                </div>
                <div className="text-[10px] font-mono text-slate-500 tracking-widest pl-7 mt-0.5 whitespace-nowrap">
                  LOCKED: <span className={targets.length > 0 ? (targets.length >= MAX_TARGETS ? "text-cyan-400" : "text-rose-400") : ""}>{targets.length}</span> / {MAX_TARGETS}
                </div>
              </div>
              {targets.length > 0 && (
                <button onClick={clearAllTargets} disabled={isLoading} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/30 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 group/clear shadow-sm hover:shadow-rose-500/20 disabled:opacity-50">
                  <Trash2 size={12} className="group-hover/clear:rotate-12 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {targets.length === 0 ? (
              <label className="min-h-[220px] flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-700/50 rounded-2xl hover:border-rose-500/50 hover:bg-rose-500/5 transition-all duration-300">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg border border-slate-700">
                  <Upload className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-slate-300 font-bold tracking-widest text-sm text-center px-4 break-keep">피규어 사진 업로드 (최대 {MAX_TARGETS}장)</span>
                <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-widest">Specimen Data Input</p>
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="relative bg-black/60 rounded-2xl border border-slate-800 shadow-inner p-4 flex flex-col overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 z-20 pointer-events-none bg-slate-900/40 backdrop-blur-[1px] rounded-2xl transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0891b211_1px,transparent_1px),linear-gradient(to_bottom,#0891b211_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="absolute border border-cyan-400/40 rounded shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-[indexing_3s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.8}s` }}>
                           <div className="absolute -top-4 -left-1 text-[6px] font-mono text-cyan-400 bg-black/80 px-1">ID: {Math.random().toString(16).slice(2, 8).toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute left-2 top-0 bottom-0 w-24 border-r border-cyan-500/10 flex flex-col gap-1 p-2 overflow-hidden opacity-50">
                       {[...Array(20)].map((_, i) => (
                         <div key={i} className="h-1 bg-cyan-500/20" style={{ width: `${Math.random() * 100}%` }}></div>
                       ))}
                    </div>
                    <div className="absolute left-0 right-0 h-[2px] bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,1)] z-40 animate-[scan_v2_2s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_100%)]"></div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                  {targets.map((target, idx) => (
                    <div key={target.id} className="relative rounded-xl border border-slate-700 overflow-hidden group bg-slate-900 flex items-center justify-center aspect-square shadow-lg">
                      <img src={target.url} alt={`Target ${idx+1}`} className={`max-h-full max-w-full object-contain p-2 transition-all duration-700 ${isLoading ? 'opacity-30 grayscale scale-90 blur-[2px]' : 'group-hover:scale-105'}`} />
                      {!isLoading && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeTarget(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {targets.length < MAX_TARGETS && (
                    <label className={`relative rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-all aspect-square group/add ${isLoading ? 'opacity-30 pointer-events-none' : ''}`}>
                      <Plus className="text-slate-500 group-hover/add:text-rose-400" size={20} />
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isLoading} />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative z-30" ref={presetsContainerRef}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-l-4 border-purple-500 pl-3 relative z-50">
              <div className="flex items-center gap-2">
                <Terminal className="text-purple-400" size={20} />
                <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">2. Command Directive</h3>
              </div>
              <button onClick={togglePresetsMenu} disabled={isLoading} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 border backdrop-blur-sm group ${isPresetsOpen ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                <Layers size={16} className={isPresetsOpen ? 'animate-pulse' : 'group-hover:text-cyan-400'} />
                Quick Presets
                <ChevronDown size={16} className={`transition-transform duration-300 ${isPresetsOpen ? 'rotate-180 text-cyan-400' : ''}`} />
              </button>
            </div>
            
            <div className="relative group/prompt">
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                disabled={isLoading} 
                className="w-full h-28 bg-black/50 border border-slate-700 rounded-xl p-4 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all disabled:opacity-50 shadow-inner select-text custom-scrollbar" 
                placeholder="원하는 배경과 분위기를 상세히 입력해주세요..." 
              />
              {prompt && !isLoading && (
                <button 
                  onClick={() => setPrompt("")}
                  className="absolute top-2 right-2 p-2 text-slate-500 hover:text-rose-500 transition-colors z-20 flex items-center justify-center active:scale-90"
                  title="초기화"
                >
                  <div className="w-5 h-5 bg-slate-800/80 rounded-full border border-slate-700/50 flex items-center justify-center shadow-lg">
                    <X size={12} strokeWidth={3} />
                  </div>
                </button>
              )}
              {isPresetsOpen && (
                <div className="absolute left-0 right-0 -top-2 transition-all duration-400 ease-in-out origin-top z-40 opacity-100 scale-y-100 pointer-events-auto">
                  <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_30px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em]">Cloud Synced Presets</span>
                      <button disabled={isLoading} onClick={handleOpenAddPresetModal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/50 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">
                        <Plus size={12} /> Add New
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 pb-1 custom-scrollbar">
                      {presets.map((preset) => (
                        <div key={preset.id} className="relative group/preset">
                          <div className={`flex flex-col h-full rounded-xl border transition-all duration-300 overflow-hidden bg-slate-800 ${prompt === preset.prompt ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-slate-800/80' : 'border-slate-600/50 hover:border-cyan-500/50'}`}>
                            <button disabled={isLoading} onClick={() => handlePresetClick(preset.prompt)} className="w-full text-left p-3 pb-2 flex-grow focus:outline-none">
                              <span className={`text-xs font-bold uppercase tracking-widest line-clamp-1 ${prompt === preset.prompt ? 'text-cyan-300' : 'text-slate-200'}`}>{preset.label}</span>
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 opacity-80 group-hover/preset:opacity-100 transition-opacity">{preset.prompt}</p>
                            </button>
                            <div className="flex justify-end gap-2 px-3 pb-2 pt-1 border-t border-slate-700/50">
                              <button onClick={(e) => handleOpenEditPresetModal(e, preset)} disabled={isLoading} className="text-slate-400 hover:text-cyan-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Pencil size={12} /></button>
                              <button onClick={(e) => handleDeletePresetClick(e, preset)} disabled={isLoading} className="text-slate-400 hover:text-rose-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative min-h-[500px]">
            <div className="flex items-center gap-2 mb-4 border-l-4 border-cyan-500 pl-3 shrink-0">
              <Zap className="text-cyan-400" size={20} />
              <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">3. Ultra Output</h3>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-black/80 overflow-hidden relative shadow-inner min-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center p-8 h-full justify-center animate-in fade-in duration-500">
                  <div className="relative mb-16 w-64 h-64 flex items-center justify-center">
                    <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite]">
                       {[...Array(24)].map((_, i) => (
                         <div key={i} className="absolute w-1 h-1 bg-cyan-400/40 rounded-full" style={{ transform: `rotate(${i * 15}deg) translateY(-120px)` }}></div>
                       ))}
                    </div>
                    
                    <div className="absolute inset-6 border-[0.5px] border-cyan-400/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
                    <div className="absolute inset-10 border-[0.5px] border-rose-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse]"></div>
                    
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-[40px] animate-[nebula_pulse_3s_ease-in-out_infinite]"></div>
                      <div className="absolute inset-2 bg-rose-500/5 rounded-full blur-[30px] animate-[nebula_pulse_3s_ease-in-out_infinite_1.5s]"></div>
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                         <div className="w-full h-full border border-cyan-400/40 rounded-full animate-[spin_2s_linear_infinite]"></div>
                         <div className="absolute w-[110%] h-[1px] bg-cyan-400 animate-pulse"></div>
                         <div className="absolute w-[1px] h-[110%] bg-cyan-400 animate-pulse"></div>
                      </div>

                      <div className="w-24 h-24 bg-slate-950 rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(34,211,238,0.4),inset_0_0_30px_rgba(34,211,238,0.2)] flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#fff_0%,#0ea5e9_60%)] opacity-0 animate-[core_beat_1.5s_ease-in-out_infinite]"></div>
                        <div className="z-10 relative">
                           <Atom size={36} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,1)] animate-[spin_5s_linear_infinite]" />
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 pointer-events-none">
                       {[...Array(6)].map((_, i) => (
                         <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-32 bg-gradient-to-t from-transparent via-cyan-400 to-transparent opacity-0 animate-[energy_burst_2s_ease-out_infinite]" style={{ transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-80px)`, animationDelay: `${i * 0.2}s` }}></div>
                       ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <p className="text-cyan-400 font-black text-[10px] sm:text-xs tracking-[0.6em] animate-pulse text-center uppercase text-shadow-glow">Matter Reconstitution in Progress</p>
                    <div className="flex gap-2">
                       <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-[ping_1.5s_infinite]"></span>
                       <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-[ping_1.5s_infinite_0.4s]"></span>
                       <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-[ping_1.5s_infinite_0.8s]"></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col p-4 gap-4">
                  <div 
                    onClick={() => resultImage && setIsViewerOpen(true)}
                    className={`flex-grow flex items-center justify-center overflow-hidden bg-black/60 rounded-xl border border-white/5 relative group/result ${resultImage ? 'cursor-zoom-in' : ''}`}
                  >
                    {resultImage ? (
                      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 z-20 pointer-events-none">
                           <div className="absolute inset-0 bg-white opacity-0 animate-[specium_flash_1.8s_ease-out_forwards]"></div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-[2px] border-cyan-400 rounded-full opacity-0 animate-[spatial_ripple_1.5s_ease-out_forwards]"></div>
                           <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-white/40 to-cyan-400/20 opacity-0 animate-[scan_sweep_v3_1s_ease-out_forwards]"></div>
                        </div>
                        
                        <img 
                          src={resultImage} 
                          alt="Result" 
                          className="max-h-[95%] max-w-[95%] object-contain transition-all duration-1000 animate-[specium_spawn_1.8s_cubic-bezier(0.16,1,0.3,1)_forwards] group-hover:scale-[1.03] group-hover:brightness-110" 
                        />
                        
                        <div className="absolute inset-0 bg-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <div className="bg-black/80 backdrop-blur-xl px-6 py-3 rounded-full border border-cyan-500/30 flex items-center gap-3 transform translate-y-8 group-hover:translate-y-0 transition-all duration-700 ease-out shadow-2xl">
                             <Eye size={20} className="text-cyan-400 animate-pulse" />
                             <span className="text-sm font-black uppercase tracking-widest text-white italic">Protocol Visualized</span>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 opacity-10 flex flex-col items-center justify-center h-full animate-in fade-in duration-1000">
                        <ImageIcon className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                        <p className="font-black tracking-widest text-[11px] uppercase font-mono">Quantum Field Offline</p>
                      </div>
                    )}
                  </div>

                  {history.length > 0 && (
                    <div className="shrink-0 pt-2 border-t border-slate-800/50">
                      <div className="flex gap-3 overflow-x-auto p-2 custom-scrollbar pr-2">
                        {history.map((img, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setResultImage(img)}
                            className={`relative shrink-0 w-16 h-16 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center bg-slate-900 overflow-hidden ${resultImage === img ? 'border-cyan-400 ring-4 ring-cyan-500/20' : 'border-slate-800'}`}
                          >
                            <img src={img} className="w-full h-full object-cover pointer-events-none" alt={`History ${idx}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultImage && (
                    <div className={`shrink-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg z-20 transition-all duration-300 border animate-in slide-in-from-bottom-6 fade-in duration-1000 ${isSaving ? 'border-cyan-400' : 'border-cyan-500/30'}`}>
                      {isSaving ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 px-4 py-2.5 bg-black/60 rounded-xl border border-slate-700/80 overflow-hidden">
                            <Pencil size={16} className="text-cyan-400 shrink-0" />
                            <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} className="bg-transparent text-sm font-mono text-cyan-50 outline-none w-full select-text" placeholder="파일명 입력" autoFocus />
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => setIsSaving(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                            <button onClick={handleDownload} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.4)]">Confirm</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setIsSaving(true)} className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 border border-transparent hover:border-cyan-400 text-cyan-50 font-black uppercase text-xs tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group">
                          <Download size={16} className="text-cyan-400" /> Extract Data
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center pb-16 gap-6">
          <div className="flex flex-col items-center gap-3 w-full max-w-lg relative z-10">
            <button
              onClick={() => handleStartEditing()}
              disabled={targets.length === 0 || isLoading || !prompt.trim()}
              className={`relative w-full overflow-hidden px-12 py-6 rounded-full font-black text-xl tracking-[0.2em] transition-all border ${(!targets.length || !prompt.trim()) ? 'bg-slate-800/50 text-slate-500 border-slate-700/50' : isLoading ? 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.6)] scale-[1.02]' : 'bg-gradient-to-r from-rose-800 to-rose-600 text-white border-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:-translate-y-1 active:translate-y-0 group italic'}`}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[size:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
              <span className={`relative z-10 flex items-center justify-center gap-4 transition-colors duration-300 ${isLoading ? 'text-white' : ''}`}>
                {isLoading ? (
                  <>
                    <Activity className="animate-pulse text-cyan-200" size={26} />
                    <span className="tracking-[0.4em] font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">ASSEMBLING...</span>
                  </>
                ) : hasEdited ? (
                  <><RotateCcw size={22} /> RE-IGNITION</>
                ) : (
                  <><Sparkles size={22} /> START PROTOCOL</>
                )}
              </span>
            </button>
            {isLoading && (
              <button onClick={handleCancelSynthesis} className="flex items-center gap-2 mt-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-all duration-300 active:scale-95">
                <XCircle size={14} /> Abort Sync
              </button>
            )}
          </div>
        </div>
      </div>

      <UltraImageViewer src={resultImage} isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} />
      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

      {showPresetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          <div className="bg-slate-950 border border-cyan-500/50 rounded-3xl w-full max-w-lg shadow-[0_0_80px_rgba(34,211,238,0.2)] overflow-hidden">
            <div className="p-8 flex flex-col gap-6">
              <h3 className="text-xl font-black text-cyan-400 uppercase tracking-widest italic border-l-4 border-cyan-500 pl-4">Add Preset Directive</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Preset Designation</label>
                  <input type="text" value={newPresetLabel} onChange={(e) => setNewPresetLabel(e.target.value)} placeholder="예: 무한한 평원" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all select-text" autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Input Instruction</label>
                  <textarea value={newPresetPrompt} onChange={(e) => setNewPresetPrompt(e.target.value)} placeholder="명령어 입력" className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none transition-all select-text custom-scrollbar" />
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <button onClick={() => setShowPresetModal(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={handleSavePreset} disabled={!newPresetLabel.trim() || !newPresetPrompt.trim()} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 transition-all">Authorize Sync</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-200 select-none">
          <div className="bg-slate-950 border border-rose-600/50 rounded-3xl w-full max-w-sm p-8 text-center shadow-[0_0_100px_rgba(225,29,72,0.3)]">
            <div className="w-20 h-20 bg-rose-600/20 border border-rose-600/50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Trash2 size={32} className="text-rose-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2 italic">Data Erasure?</h3>
            <p className="text-slate-500 text-sm mb-10 break-keep">선택한 프리셋 파일을 영구적으로 삭제하시겠습니까?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Abort</button>
              <button onClick={confirmDeletePreset} className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all">Confirm Erase</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
        .text-shadow-glow { text-shadow: 0 0 15px rgba(34,211,238,1); }
        .select-text { user-select: text !important; -webkit-user-select: text !important; }
        
        @keyframes scan_v2 {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }

        @keyframes indexing {
          0% { width: 10px; height: 10px; top: 10%; left: 10%; opacity: 0; }
          20% { width: 80px; height: 80px; opacity: 1; }
          80% { opacity: 1; }
          100% { top: 80%; left: 70%; width: 20px; height: 20px; opacity: 0; }
        }

        @keyframes nebula_pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.6); opacity: 0.3; }
        }

        @keyframes core_beat {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes energy_burst {
          0% { height: 0; opacity: 0; transform: translate(-50%, -50%) rotate(var(--tw-rotate)) translateY(-60px); }
          30% { opacity: 1; height: 120px; }
          100% { height: 0; opacity: 0; transform: translate(-50%, -50%) rotate(var(--tw-rotate)) translateY(-180px); }
        }

        @keyframes specium_spawn {
          0% { opacity: 0; transform: scale(0.85) translateY(30px); filter: brightness(3) blur(20px); }
          40% { opacity: 0.8; transform: scale(1.05) translateY(-5px); filter: brightness(1.5) blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1) blur(0); }
        }

        @keyframes specium_flash {
          0% { opacity: 1; }
          70% { opacity: 0.2; }
          100% { opacity: 0; }
        }

        @keyframes spatial_ripple {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 200%; height: 200%; opacity: 0; }
        }

        @keyframes scan_sweep_v3 {
          0% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(1.5); }
        }

        @keyframes shimmer {
          0% { background-position: -150% -150%; }
          100% { background-position: 150% 150%; }
        }

        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
