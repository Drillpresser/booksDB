'use strict';
// No-op stub that replaces react-native-reanimated on iOS 26 where
// reanimated's NativeWorklets initialization crashes Expo Go 54.
// All animation hooks return inert values; UI renders but without motion.
const React = require('react');
const RN = require('react-native');

const useSharedValue = (init) => React.useRef(init);
const useDerivedValue = (fn) => { const r = React.useRef(fn()); return r; };
const useAnimatedStyle = (_fn) => React.useRef({}).current;
const withTiming = (v, _cfg, cb) => { cb && cb(true); return v; };
const withSpring = (v, _cfg, cb) => { cb && cb(true); return v; };
const withDecay = (_cfg, cb) => { cb && cb(true); return 0; };
const withDelay = (_d, a) => a;
const withSequence = (...a) => a[a.length - 1];
const withRepeat = (a) => a;
const interpolate = (val, inR, outR) => {
  if (!inR.length) return outR[0];
  const i = inR.findIndex((v) => val <= v);
  if (i <= 0) return outR[0];
  if (i >= inR.length) return outR[outR.length - 1];
  const t = (val - inR[i - 1]) / (inR[i] - inR[i - 1]);
  return outR[i - 1] + t * (outR[i] - outR[i - 1]);
};
const interpolateColor = (_v, _i, colors) => colors[0];
const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;
const makeMutable = (init) => ({ value: init });
const cancelAnimation = () => {};
const useAnimatedRef = () => React.createRef();
const measure = () => null;
const scrollTo = () => {};
const useScrollViewOffset = () => ({ value: 0 });
const useAnimatedScrollHandler = () => ({});
const useAnimatedGestureHandler = () => ({});
const useAnimatedReaction = () => {};
const useFrameCallback = () => ({});
const useReducedMotion = () => false;
const createAnimatedComponent = (C) => C;

const Easing = {
  linear: (t) => t, ease: (t) => t, quad: (t) => t * t,
  cubic: (t) => t * t * t, poly: (n) => (t) => Math.pow(t, n),
  sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
  circle: (t) => 1 - Math.sqrt(1 - t * t),
  exp: (t) => Math.pow(2, 10 * (t - 1)),
  elastic: () => (t) => t, back: () => (t) => t, bounce: (t) => t,
  bezier: () => (t) => t, bezierFn: () => (t) => t,
  in: (e) => e, out: (e) => (t) => 1 - e(1 - t),
  inOut: (e) => (t) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
  steps: (n) => (t) => Math.round(t * n) / n,
};

module.exports = {
  useSharedValue, useDerivedValue, useAnimatedStyle,
  withTiming, withSpring, withDecay, withDelay, withSequence, withRepeat,
  interpolate, interpolateColor, Extrapolation, ExtrapolationType: Extrapolation,
  runOnJS, runOnUI, makeMutable, cancelAnimation,
  useAnimatedRef, measure, scrollTo, useScrollViewOffset,
  useAnimatedScrollHandler, useAnimatedGestureHandler,
  useAnimatedReaction, useFrameCallback, useReducedMotion,
  createAnimatedComponent, Easing,
  FlatList: RN.FlatList,
  ScrollView: RN.ScrollView,
  View: RN.View,
  Text: RN.Text,
  Image: RN.Image,
  default: { createAnimatedComponent },
};
