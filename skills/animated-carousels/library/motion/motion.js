/* Carousel motion runtime. Load after motion/vendor/gsap.min.js on an animated slide.
 *
 * Builds ONE paused GSAP timeline from declarative attributes and registers it where HyperFrames
 * seeks it (window.__timelines[<composition id>]). The same file runs in plain Chromium for the
 * still checks: with settle on, it jumps everything to its rest state and stamps a sentinel.
 *
 * Attributes (data-at is the start in seconds; each move ends at the element's resting layout,
 * which is the approved still):
 *   data-motion="type"   types the element's text left to right (monospace: one step per char).
 *                        data-dur overrides the default of 0.045s per character.
 *   data-motion="rise"   fades in from 28px below.
 *   data-motion="pop"    scales in from 0.92 with a small overshoot. Avoid it: in testing a scaled
 *                        card, row of tiles and badge each failed the determinism check. Use "rise".
 *   data-motion="select" on a .sel highlighter: the selection sweeps left to right over 0.6s.
 *   data-motion="reselect" the same, but it starts selected, clears, and sweeps back on (1.05s),
 *                        so frame 0 is the still and a "seamless" slide such as a cover can use it.
 *
 * Rest state: every GSAP move rests at the "rest" label (the end of the build), every CSS animation
 * at its time 0 (each motion/*.css keyframe starts on the frozen still). Settle seeks "rest" and
 * sets <html data-settled="1">, or "failed" if the playhead does not reach it.
 *
 * Loop: animate.mjs stamps <html data-loop="seamless|jump|return">. Only "return" changes the
 * timeline: the build plays, holds, then plays in reverse so it ends back at frame 0 at the
 * composition's duration minus 0.05s, and the loop has no jump. The registered timeline is then a
 * master wrapping the build; "rest" still marks the end of the build on both.
 *
 * The slide only moves when animate.mjs's composition marks <html data-animate>. Anywhere else
 * (render.mjs, a browser, the review crop) it settles, so one slide file serves the still and the
 * video. ?settle=1 forces settle even under data-animate.
 */
(function () {
  var doc = document.documentElement;
  var root = document.querySelector('[data-composition-id]');
  var id = root ? root.getAttribute('data-composition-id') : 'main';
  var dur = root ? parseFloat(root.getAttribute('data-duration')) || 6 : 6;
  doc.style.setProperty('--motion-dur', dur + 's');

  var build = gsap.timeline({ paused: true });

  function at(el, fallback) {
    var v = parseFloat(el.getAttribute('data-at'));
    return isNaN(v) ? fallback : v;
  }

  document.querySelectorAll('[data-motion]').forEach(function (el) {
    var kind = el.getAttribute('data-motion');
    var start = at(el, 0.3);
    if (kind === 'type') {
      var chars = Math.max(1, el.textContent.length);
      var d = parseFloat(el.getAttribute('data-dur')) || chars * 0.045;
      // inline-block so clip-path has a box; text-indent 0 because an inline-block inherits the
      // terminal's hanging indent (-1.2em) and would push its first characters out of that box
      el.style.display = 'inline-block';
      el.style.textIndent = '0';
      build.fromTo(el, { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: d, ease: 'steps(' + chars + ')' }, start);
    } else if (kind === 'rise') {
      build.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, start);
    } else if (kind === 'pop') {
      build.fromTo(el, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, start);
    } else if (kind === 'select') {
      // the headline highlighter (.sel in product.css): the selection sweeps across the phrase
      build.fromTo(el, { '--sel': '0%' }, { '--sel': '100%', duration: 0.6, ease: 'power2.inOut' }, start);
    } else if (kind === 'reselect') {
      // starts selected, so frame 0 is the still: the selection clears, then sweeps back on
      build.fromTo(el, { '--sel': '100%' }, { '--sel': '0%', duration: 0.35, ease: 'power2.in' }, start);
      build.to(el, { '--sel': '100%', duration: 0.6, ease: 'power2.inOut' }, start + 0.45);
    }
  });

  var rest = build.duration();
  build.addLabel('rest', rest);

  var tl = build;
  if (doc.getAttribute('data-loop') === 'return') {
    // Two tweens of the build's playhead, so HyperFrames seeks one timeline. The reverse never
    // starts before the build has ended.
    tl = gsap.timeline({ paused: true });
    tl.add(build.tweenFromTo(0, rest), 0);
    tl.add(build.tweenFromTo(rest, 0), Math.max(rest, dur - 0.05 - rest));
    tl.addLabel('rest', rest);
  }

  window.__timelines = window.__timelines || {};
  window.__timelines[id] = tl;

  var settle = /[?&]settle=1\b/.test(location.search) || !doc.hasAttribute('data-animate');
  if (!settle) return;

  tl.seek('rest');
  document.getAnimations().forEach(function (a) {
    a.pause();
    a.currentTime = 0;
  });
  var atRest = Math.abs(tl.time() - tl.labels.rest) < 1e-6 && Math.abs(build.time() - rest) < 1e-6;
  doc.setAttribute('data-settled', atRest ? '1' : 'failed');
})();
