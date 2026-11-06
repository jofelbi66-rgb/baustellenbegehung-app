import { useEffect, useRef } from 'react';

// One input event family and one restore path: ending a stroke never resets the canvas.
export function useSignatureCanvas(canvasRef, value, onChange, onError) {
  const callbacks = useRef({ onChange, onError });
  callbacks.current = { onChange, onError };
  const generation = useRef(0);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.style.touchAction = 'none';
    let pointerId = null;
    let lastPoint = null;

    const size = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        const previous = document.createElement('canvas');
        previous.width = canvas.width;
        previous.height = canvas.height;
        previous.getContext('2d').drawImage(canvas, 0, 0);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(previous, 0, 0, width, height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (drawing.current && lastPoint) {
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
        }
      } else ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111';
      ctx.fillStyle = '#111';
    };
    const point = event => {
      const rect = canvas.getBoundingClientRect();
      const p = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const start = event => {
      if (drawing.current || (event.button != null && event.button !== 0)) return;
      event.preventDefault();
      generation.current++;
      size();
      drawing.current = true;
      pointerId = event.pointerId ?? null;
      lastPoint = point(event);
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      if (pointerId != null) {
        try { canvas.setPointerCapture(pointerId); } catch { /* Older browsers may not capture. */ }
      }
    };
    const matches = event => pointerId == null || event.pointerId === pointerId;
    const move = event => {
      if (!drawing.current || !matches(event)) return;
      event.preventDefault();
      lastPoint = point(event);
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    };
    const end = event => {
      if (!drawing.current || !matches(event)) return;
      event.preventDefault();
      drawing.current = false;
      generation.current++;
      try { callbacks.current.onChange(canvas.toDataURL('image/png')); }
      catch (error) { callbacks.current.onError?.(error); }
      const released = pointerId;
      pointerId = null;
      if (released != null) {
        try { canvas.releasePointerCapture(released); } catch { /* Already released. */ }
      }
    };
    size();
    const events = window.PointerEvent
      ? [['pointerdown', start], ['pointermove', move], ['pointerup', end], ['pointercancel', end], ['lostpointercapture', end]]
      : [['touchstart', start], ['touchmove', move], ['touchend', end], ['touchcancel', end], ['mousedown', start], ['mousemove', move], ['mouseup', end], ['mouseleave', end]];
    for (const [name, handler] of events) canvas.addEventListener(name, handler, { passive: false });
    window.addEventListener('resize', size);
    return () => {
      drawing.current = false;
      generation.current++;
      for (const [name, handler] of events) canvas.removeEventListener(name, handler);
      window.removeEventListener('resize', size);
    };
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const token = ++generation.current;
    if (drawing.current) return;
    const paint = image => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (image) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    if (!value) { paint(null); return; }
    // The live drawing is already correct. Do not clear it to reload the same PNG.
    if (canvas.toDataURL('image/png') === value) return;
    const image = new Image();
    image.onload = () => {
      if (generation.current === token && !drawing.current) paint(image);
    };
    image.onerror = () => {
      if (generation.current === token) callbacks.current.onError?.(new Error('Gespeicherte Unterschrift konnte nicht angezeigt werden.'));
    };
    image.src = value;
    return () => { generation.current++; };
  }, [canvasRef, value]);
}
