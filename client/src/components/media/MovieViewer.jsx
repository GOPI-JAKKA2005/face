import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Keyboard, Navigation } from 'swiper/modules';
import * as Slider from '@radix-ui/react-slider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiPlay,
  FiPause,
  FiVolume2,
  FiVolumeX,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiRotateCw,
  FiFilm
} from 'react-icons/fi';
import { formatDateDisplay } from '../../lib/time.js';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-fade';

export function MovieViewer({ items = [], initialIndex = 0, onClose = () => {} }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [slideshowInterval, setSlideshowInterval] = useState(4); // 4s default
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const swiperRef = useRef(null);
  const activeVideoRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Slideshow timer
  useEffect(() => {
    if (!slideshowActive || items.length <= 1) return;
    const timer = setInterval(() => {
      swiperRef.current?.slideNext();
    }, slideshowInterval * 1000);
    return () => clearInterval(timer);
  }, [slideshowActive, slideshowInterval, items.length]);

  const activeItem = items[activeIndex] || items[0];

  const handleSpeedCycle = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 0.5 : 1;
    setSpeed(nextSpeed);
    if (activeVideoRef.current) activeVideoRef.current.playbackRate = nextSpeed;
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#06060c] text-white flex flex-col justify-between select-none overflow-hidden">
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)] z-10" />

      {/* Top Header Bar */}
      <header className="relative z-20 h-16 px-4 sm:px-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <FiFilm className="w-5 h-5 text-accent" />
          <span className="font-bold text-sm tracking-wider uppercase font-poppins">
            Movie View • {activeIndex + 1} / {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Slideshow Toggle */}
          <button
            type="button"
            onClick={() => setSlideshowActive(!slideshowActive)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              slideshowActive ? 'bg-accent text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <FiRotateCw className={`w-3.5 h-3.5 ${slideshowActive ? 'animate-spin' : ''}`} />
            <span>Slideshow</span>
          </button>

          {/* Info toggle */}
          <button
            type="button"
            onClick={() => setInfoOpen(!infoOpen)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Metadata Info"
          >
            <FiInfo className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-2"
            title="Exit Movie View"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Center Swiper Carousel */}
      <div className="relative flex-1 w-full flex items-center justify-center my-auto z-10 overflow-hidden">
        <Swiper
          modules={[EffectCoverflow, Keyboard, Navigation]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView="auto"
          initialSlide={initialIndex}
          keyboard={{ enabled: true }}
          coverflowEffect={{
            rotate: 20,
            stretch: 0,
            depth: 250,
            modifier: 1,
            slideShadows: true
          }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="w-full max-w-5xl h-[65vh] flex items-center"
        >
          {items.map((item, idx) => (
            <SwiperSlide key={item.id || idx} className="max-w-2xl flex items-center justify-center p-4">
              <div className="relative w-full h-full max-h-[55vh] flex items-center justify-center bg-black/60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                {item.kind === 'video' || item.dataBase64 ? (
                  <video
                    ref={idx === activeIndex ? activeVideoRef : null}
                    src={item.dataBase64 || item.url}
                    poster={item.posterBase64}
                    playsInline
                    loop
                    autoPlay={idx === activeIndex}
                    muted={isMuted}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={item.url || item.photoUrl}
                    alt={item.title || item.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Carousel Navigation Arrows */}
        <button
          type="button"
          onClick={() => swiperRef.current?.slidePrev()}
          className="hidden sm:flex absolute left-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md items-center justify-center text-white transition-colors"
        >
          <FiChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => swiperRef.current?.slideNext()}
          className="hidden sm:flex absolute right-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md items-center justify-center text-white transition-colors"
        >
          <FiChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Control Bar & Captions */}
      <footer className="relative z-20 px-6 py-4 bg-gradient-to-t from-black/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 pb-safe">
        {/* Caption */}
        <motion.div
          key={activeItem?.id || activeIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center sm:text-left"
        >
          <h3 className="font-bold text-base sm:text-lg tracking-tight text-white font-poppins">
            {activeItem?.title || activeItem?.name || 'Media Asset'}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {activeItem?.rollNo ? `Roll: ${activeItem.rollNo} • ` : ''}
            {activeItem?.sizeBytes ? `${Math.round(activeItem.sizeBytes / 1024)} KB` : ''}
          </p>
        </motion.div>

        {/* Media Controls for Videos */}
        {activeItem?.kind === 'video' && (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button
              type="button"
              onClick={() => {
                if (activeVideoRef.current) {
                  if (isPlaying) activeVideoRef.current.pause();
                  else activeVideoRef.current.play();
                  setIsPlaying(!isPlaying);
                }
              }}
              className="p-1 hover:text-accent transition-colors"
            >
              {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 hover:text-accent transition-colors"
            >
              {isMuted ? <FiVolumeX className="w-4 h-4" /> : <FiVolume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSpeedCycle}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/15 hover:bg-white/25 transition-colors"
            >
              {speed}x
            </button>
          </div>
        )}

        {/* Slideshow Interval Slider */}
        {slideshowActive && (
          <div className="flex items-center gap-2 w-48 text-xs">
            <span className="text-gray-400 text-[10px]">Speed:</span>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-4"
              value={[slideshowInterval]}
              onValueChange={([val]) => setSlideshowInterval(val)}
              min={2}
              max={10}
              step={1}
            >
              <Slider.Track className="bg-white/20 relative grow rounded-full h-1">
                <Slider.Range className="absolute bg-accent rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-3.5 h-3.5 bg-white rounded-full shadow" />
            </Slider.Root>
            <span className="font-mono text-gray-300 text-[10px]">{slideshowInterval}s</span>
          </div>
        )}
      </footer>

      {/* Info Drawer */}
      <AnimatePresence>
        {infoOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-16 right-4 z-40 w-72 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl text-xs space-y-2.5"
          >
            <h4 className="font-bold text-sm text-white border-b border-white/10 pb-2">Asset Details</h4>
            <div className="flex justify-between text-gray-400">
              <span>Format:</span>
              <span className="font-mono text-white uppercase">{activeItem?.mime || 'image/jpeg'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Size Ceiling:</span>
              <span className="font-mono text-success font-semibold">&lt; 500 KB</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Payload Size:</span>
              <span className="font-mono text-white">{activeItem?.sizeBytes ? `${Math.round(activeItem.sizeBytes / 1024)} KB` : 'N/A'}</span>
            </div>
            {activeItem?.durationSec && (
              <div className="flex justify-between text-gray-400">
                <span>Duration:</span>
                <span className="font-mono text-white">{activeItem.durationSec}s</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Created:</span>
              <span className="text-white">{formatDateDisplay(activeItem?.createdAt)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
