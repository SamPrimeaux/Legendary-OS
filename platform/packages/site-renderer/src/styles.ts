export const BASE_CSS = `
:root{--canvas:#fff;--paper:#fff;--muted:#eee;--ink:#111;--ink-soft:#555;--accent:#06c;--accent-ink:#fff;--inverse:#111;--inverse-ink:#fff;--font-display:Georgia,serif;--font-body:system-ui,sans-serif;--radius:10px;--heading-tracking:0}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);font:16px/1.65 var(--font-body)}
img{max-width:100%;display:block}a{color:inherit}
h1,h2,h3{font-family:var(--font-display);letter-spacing:var(--heading-tracking);line-height:1.12;margin:0 0 .5em}
h1{font-size:clamp(2.2rem,5vw,3.8rem)}h2{font-size:clamp(1.6rem,3vw,2.4rem)}h3{font-size:1.2rem}
.s-wrap{max-width:1100px;margin:0 auto;padding:0 24px}.s-wrap--narrow{max-width:720px}
.s--w-wide .s-wrap{max-width:1280px}.s--w-full .s-wrap{max-width:none}
.s{padding:72px 0;position:relative}.s--sp-none{padding:0}.s--sp-sm{padding:40px 0}.s--sp-lg{padding:112px 0}
.s--canvas{background:var(--canvas)}.s--paper{background:var(--paper)}.s--muted{background:var(--muted)}
.s--inverse{background:var(--inverse);color:var(--inverse-ink)}
.s-eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.78rem;color:var(--accent);margin:0 0 .75rem}
.s-lead{font-size:1.2rem;color:var(--ink-soft);max-width:60ch}.s--inverse .s-lead{color:inherit;opacity:.85}
.s-center{text-align:center}.s-head{margin-bottom:2rem}.s-head p{max-width:60ch;color:var(--ink-soft)}
.s-btn{display:inline-block;background:var(--accent);color:var(--accent-ink);border:2px solid var(--accent);padding:.8em 1.5em;border-radius:var(--radius);font:600 .95rem var(--font-body);text-decoration:none;cursor:pointer}
.s-btn--ghost{background:transparent;color:inherit;border-color:currentColor}
.s-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:1.5rem}
.s-badge{display:inline-block;background:var(--muted);color:var(--ink);font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;padding:.2em .6em;border-radius:99px;margin-bottom:.4rem}
.s-media{width:100%;object-fit:cover;border-radius:var(--radius)}
.s-media--empty{min-height:200px;background:linear-gradient(135deg,var(--muted),color-mix(in srgb,var(--accent) 18%,var(--muted)))}
.s-announce{background:var(--inverse);color:var(--inverse-ink);text-align:center;font-size:.85rem;padding:.5rem 1rem}.s-announce a{text-decoration:none}
.s-header{position:sticky;top:0;z-index:20;background:var(--paper);border-bottom:1px solid var(--muted)}
.s-header__bar{display:flex;align-items:center;gap:24px;padding:14px 24px;max-width:1280px;margin:0 auto}
.s-brandname{font:700 1.25rem var(--font-display);text-decoration:none}.s-logo{height:40px;width:auto}
.s-nav{display:flex;gap:22px;margin-left:auto;align-items:center}.s-nav a{text-decoration:none;font-size:.92rem}.s-nav a[aria-current=page]{color:var(--accent);font-weight:600}
.s-nav__toggle{display:none;margin-left:auto;background:none;border:1px solid var(--muted);border-radius:8px;padding:.4rem .7rem;font-size:1rem}
.s-hero{padding:0}.s-hero__bg{position:absolute;inset:0;z-index:0}.s-hero__img{width:100%;height:100%;border-radius:0}
.s-hero .s-media--empty{min-height:100%;height:100%}
.s-hero__body{position:relative;z-index:1;padding-top:96px;padding-bottom:96px}
.s-hero.s--inverse .s-hero__bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--inverse) 78%,transparent),transparent)}
.s-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}.s-split--rev .s-split__media{order:-1}
.s-split__media .s-media{aspect-ratio:4/3}
.s-grid{display:grid;gap:24px}.s-grid--2{grid-template-columns:repeat(2,1fr)}.s-grid--3{grid-template-columns:repeat(3,1fr)}.s-grid--4{grid-template-columns:repeat(4,1fr)}
.s-card{display:block;background:var(--paper);border-radius:var(--radius);overflow:hidden;text-decoration:none;border:1px solid var(--muted)}
.s--paper .s-card{background:var(--canvas)}
.s-card__media{border-radius:0;aspect-ratio:4/3}.s-card__body{padding:20px}.s-card__body p{margin:.3em 0 0;color:var(--ink-soft);font-size:.95rem}
.s-card__meta{font-size:.8rem!important;letter-spacing:.06em;text-transform:uppercase}
.s-card__num{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-weight:700;margin-bottom:.6rem}
.s-ba-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px}
.s-ba{margin:0}.s-ba figcaption{margin-top:.6rem;color:var(--ink-soft);font-size:.9rem}
.s-ba__stage{position:relative;aspect-ratio:4/3;border-radius:var(--radius);overflow:hidden;background:var(--muted)}
.s-ba__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:0}
.s-ba__after{position:absolute;inset:0;clip-path:inset(0 0 0 var(--pos,50%))}
.s-ba__after .s-media--empty{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 35%,var(--paper)),var(--accent))}
.s-ba__divider{position:absolute;top:0;bottom:0;left:var(--pos,50%);width:3px;background:#fff;transform:translateX(-50%);pointer-events:none}
.s-ba__divider span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;color:#111;border-radius:50%;width:36px;height:36px;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.s-ba__tag{position:absolute;bottom:12px;background:rgba(0,0,0,.6);color:#fff;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;padding:.25em .7em;border-radius:99px}
.s-ba__tag--before{left:12px}.s-ba__tag--after{right:12px}
.s-ba__range{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0}
.s-quote{background:var(--paper);border-radius:var(--radius);padding:24px;border:1px solid var(--muted);margin:0}
.s-quote blockquote{margin:0 0 1rem;font-size:1.05rem}.s-quote figcaption{font-size:.85rem;color:var(--ink-soft)}
.s-cta{text-align:center}.s-cta .s-actions{justify-content:center}
.s-form{display:grid;gap:16px}.s-field{display:grid;gap:6px}.s-field label{font-size:.85rem;font-weight:600}
.s-field input,.s-field select,.s-field textarea{font:inherit;padding:.7em .9em;border:1px solid color-mix(in srgb,var(--ink) 25%,transparent);border-radius:8px;background:var(--paper);color:var(--ink);width:100%}
.s-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.s-form__status{margin:0;font-size:.9rem;min-height:1.4em}
.s-footer{background:var(--inverse);color:var(--inverse-ink);padding:56px 0 32px}
.s-footer__grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px}.s-footer a{text-decoration:none;opacity:.85}.s-footer ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.s-footer__legal{margin-top:32px;font-size:.8rem;opacity:.65}
.s-overlay{border:0;border-radius:var(--radius);padding:0;max-width:640px;width:calc(100% - 32px);background:var(--paper);color:var(--ink)}
.s-overlay::backdrop{background:rgba(0,0,0,.55)}.s-overlay .s{padding:40px 0}
.s-overlay__close{position:absolute;right:12px;top:8px;background:none;border:0;font-size:1.8rem;cursor:pointer;color:inherit;z-index:2}
.s-missing{color:#b00020;font-family:monospace}
.s-proof{display:flex;gap:8px;flex-wrap:wrap;list-style:none;padding:0;margin:1.4rem 0 0}.s-proof li{border:1px solid currentColor;border-radius:99px;padding:.2em .85em;font-size:.8rem;opacity:.85}
.s-points{margin:1rem 0 0;padding-left:1.2em;color:var(--ink-soft)}.s-points li{margin:.3em 0}
.s-split--solo{grid-template-columns:1fr;max-width:760px}
.s-mark{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--inverse);color:var(--inverse-ink);font:700 1rem var(--font-display);margin-right:.55rem;vertical-align:middle}
.s-nav__utility{opacity:.65;font-size:.78rem}
@media(max-width:820px){.s-split,.s-footer__grid{grid-template-columns:1fr}.s-grid--3,.s-grid--4,.s-grid--2{grid-template-columns:1fr 1fr}
.s-nav{display:none;position:absolute;left:0;right:0;top:100%;background:var(--paper);flex-direction:column;align-items:flex-start;padding:16px 24px;border-bottom:1px solid var(--muted)}
.nav-open .s-nav{display:flex}.s-nav__toggle{display:block}}
@media(max-width:560px){.s-grid--3,.s-grid--4,.s-grid--2{grid-template-columns:1fr}.s{padding:56px 0}}
@media(prefers-reduced-motion:no-preference){.s-btn{transition:transform .15s}.s-btn:hover{transform:translateY(-1px)}}
`;
