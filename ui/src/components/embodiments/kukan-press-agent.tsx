import React, { useMemo, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Separator from '@radix-ui/react-separator';
import * as Tabs from '@radix-ui/react-tabs';

function KukanPressGrid() {
  const [district, setDistrict] = useState('koenji');
  const [saved, setSaved] = useState(true);
  const [nightEdition, setNightEdition] = useState(false);

  const districtData = useMemo(function () {
    return {
      koenji: {
        code: 'KJ-08',
        line: 'Koenji',
        note: 'Alley listening bars add standing-room screenings after 22:00.',
        stamp: 'Most annotated district this week'
      },
      kanda: {
        code: 'KD-03',
        line: 'Kanda',
        note: 'Bookshop basements pull more letterpress workshops into weekday slots.',
        stamp: 'Transit footfall rose +14%'
      },
      shimokitazawa: {
        code: 'SM-12',
        line: 'Shimokitazawa',
        note: 'Zine fairs spill into side streets, increasing micro-venue overlap.',
        stamp: 'Late shows still selling out'
      }
    };
  }, []);

  const activeDistrict = districtData[district as keyof typeof districtData];

  return (
    <div className="pageShell">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }
        :root {
          --primary: #111111;
          --secondary: #5B5B5B;
          --accent: #E94B35;
          --background: #F4F0E8;
          --surface: #FFFDF8;
          --text: #151515;
          --muted: #746E67;
          --border: #1E1E1E;
          --highlight: #F6D8D0;
          --sage: #DCE5DA;
          --folio: #E7E0D4;
          --shadow-sm: 0 1px 0 rgba(0,0,0,0.08);
          --shadow-md: 0 8px 24px rgba(17,17,17,0.08);
          --shadow-lg: 0 18px 50px rgba(17,17,17,0.12);
          --radius-sm: 6px;
          --radius-md: 12px;
          --radius-lg: 20px;
          --duration: 180ms;
          --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        html, body { min-height: 100%; }
        body {
          font-family: 'Zen Kaku Gothic New', sans-serif;
          color: var(--text);
          background:
            linear-gradient(rgba(30,30,30,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,30,30,0.06) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15)),
            var(--background);
          background-size: 24px 24px, 24px 24px, auto, auto;
        }
        a { color: inherit; text-decoration: none; }
        button { cursor: pointer; }
        .pageShell { min-height: 100vh; padding: 24px; }
        .spread {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }
        .panel, .feature, .rail, .schedule, .quote, .archive, .subscription, .insightPanel {
          position: relative;
          overflow: hidden;
          background: rgba(255, 253, 248, 0.96);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }
        .panel::before, .feature::before, .rail::before, .schedule::before, .quote::before, .archive::before, .subscription::before, .insightPanel::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          background: rgba(30,30,30,0.14);
        }
        .masthead {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(0, 2.5fr) minmax(300px, 1fr);
          gap: 18px;
          align-items: end;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .wordmark {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: end;
          gap: 18px;
        }
        .folioBig {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(70px, 10vw, 128px);
          line-height: 0.78;
          color: var(--accent);
        }
        .kicker, .metaText, .utilityLabel, .stamp, .tabMeta, .fieldLabel, .tinyMeta, .sectionLine {
          font-family: 'IBM Plex Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .kicker {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-bottom: 12px;
        }
        .kicker::before {
          content: '';
          width: 18px;
          height: 1px;
          background: var(--accent);
        }
        .titleBlock h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 5vw, 76px);
          line-height: 0.9;
          font-weight: 600;
          max-width: 9.5ch;
        }
        .titleBlock p {
          max-width: 62ch;
          font-size: 15px;
          line-height: 1.62;
          margin-top: 10px;
          color: var(--secondary);
        }
        .mastMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
          padding-bottom: 8px;
        }
        .pill {
          border: 1px solid var(--border);
          padding: 8px 10px;
          background: rgba(255, 253, 248, 0.82);
          font-size: 11px;
        }
        .mainFeature {
          grid-column: 1 / span 7;
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(172px, 0.55fr);
          min-height: 560px;
        }
        .featureStory {
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          padding: 18px;
          gap: 14px;
          border-right: 1px solid var(--border);
        }
        .featureHeader { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
        .featureHeader .metaText { font-size: 11px; color: var(--muted); }
        .rotateSticker {
          position: absolute;
          right: 24px;
          top: 86px;
          transform: rotate(-6deg);
          background: var(--highlight);
          border: 1px solid var(--border);
          box-shadow: 3px 3px 0 rgba(30,30,30,0.08);
          padding: 10px 12px;
          font-size: 11px;
          z-index: 2;
        }
        .featureTitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 4vw, 58px);
          line-height: 0.95;
          max-width: 11ch;
          position: relative;
          display: inline-block;
        }
        .featureTitle::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -8px;
          width: 64%;
          height: 3px;
          background: var(--accent);
          transform: translateX(10px);
        }
        .lede {
          font-size: 15px;
          line-height: 1.62;
          color: var(--secondary);
          max-width: 54ch;
        }
        .imageBand {
          position: relative;
          display: grid;
          grid-template-columns: 1.25fr 0.58fr;
          gap: 14px;
          min-height: 280px;
          align-items: stretch;
        }
        .imgMain, .imgSlice, .imgStrip, .miniImage {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 25%, rgba(233,75,53,0.88), transparent 0 14%),
            radial-gradient(circle at 74% 28%, rgba(17,17,17,0.75), transparent 0 18%),
            linear-gradient(120deg, rgba(230,215,197,0.2), rgba(255,255,255,0.05)),
            linear-gradient(135deg, #3b332d 0%, #85786d 32%, #e0d7cb 52%, #61564f 100%);
          background-size: cover;
        }
        .imgMain::before, .imgSlice::before, .imgStrip::before, .miniImage::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 1px, transparent 1px, transparent 40px),
            linear-gradient(180deg, rgba(0,0,0,0) 15%, rgba(0,0,0,0.18) 100%);
          mix-blend-mode: screen;
        }
        .imgMain { min-height: 280px; }
        .imgSliceWrap { display: grid; gap: 14px; }
        .imgSlice { min-height: 132px; }
        .imgStrip { min-height: 132px; background-position: center; }
        .captionRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .captionRow p { font-size: 13px; color: var(--secondary); line-height: 1.45; }
        .noteChip {
          align-self: start;
          justify-self: start;
          background: var(--highlight);
          border: 1px solid var(--border);
          padding: 10px 12px;
          font-size: 11px;
          transform: translateY(-10px);
        }
        .supportRail {
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          background: var(--sage);
          padding: 18px;
          gap: 14px;
        }
        .statStack {
          display: grid;
          gap: 12px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 16px 0;
        }
        .statItem strong {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          line-height: 0.9;
        }
        .statItem span { display: block; font-size: 12px; color: var(--muted); margin-top: 4px; }
        .railNote { font-size: 13px; line-height: 1.5; color: var(--secondary); }
        .subgrid {
          grid-column: 8 / -1;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 18px;
        }
        .schedule { grid-column: span 3; min-height: 560px; padding: 18px; display: grid; gap: 14px; }
        .scheduleHeader { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
        .scheduleHeader h3, .storyPanel h3, .archive h3, .subscription h3, .insightPanel h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          line-height: 0.94;
          font-weight: 600;
        }
        .selectTrigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border);
          padding: 12px 14px;
          background: rgba(255,253,248,0.72);
          font-size: 13px;
        }
        .selectContent {
          overflow: hidden;
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
          z-index: 20;
        }
        .selectViewport { padding: 6px; }
        .selectItem {
          font-size: 13px;
          padding: 10px 12px;
          position: relative;
          user-select: none;
        }
        .selectItem[data-highlighted] {
          background: var(--highlight);
          outline: none;
        }
        .agendaList { display: grid; gap: 8px; }
        .agendaItem {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 12px;
          border-top: 1px solid rgba(30,30,30,0.2);
          padding-top: 10px;
        }
        .agendaTime { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); }
        .agendaItem h4 { font-size: 14px; line-height: 1.25; font-weight: 700; }
        .agendaItem p { font-size: 12px; color: var(--secondary); line-height: 1.45; margin-top: 4px; }
        .districtStamp {
          background: rgba(255,253,248,0.9);
          border: 1px solid var(--border);
          padding: 10px 12px;
          transform: rotate(2deg);
          width: max-content;
          max-width: 100%;
          box-shadow: 3px 3px 0 rgba(30,30,30,0.08);
        }
        .storyPanel { grid-column: span 2; display: grid; gap: 14px; }
        .storyCard { padding: 18px; min-height: 271px; display: grid; gap: 14px; }
        .miniImage { min-height: 130px; }
        .storyCard p { font-size: 13px; color: var(--secondary); line-height: 1.5; }
        .quote {
          grid-column: 1 / span 4;
          padding: 18px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          background: linear-gradient(90deg, var(--folio), rgba(255,253,248,0.95));
        }
        .quoteNumber {
          font-family: 'Cormorant Garamond', serif;
          font-size: 80px;
          line-height: 0.75;
          color: var(--accent);
        }
        blockquote {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1.02;
          max-width: 17ch;
        }
        .quoteMeta { font-size: 11px; color: var(--muted); text-align: right; }
        .insightPanel {
          grid-column: 5 / span 4;
          padding: 18px;
          display: grid;
          gap: 16px;
          min-height: 292px;
        }
        .tabsList {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border: 1px solid var(--border);
        }
        .tabTrigger {
          padding: 12px 10px;
          border-right: 1px solid var(--border);
          background: rgba(255,253,248,0.65);
          text-align: left;
          display: grid;
          gap: 3px;
          transition: background var(--duration) var(--ease), transform var(--duration) var(--ease);
        }
        .tabTrigger:last-child { border-right: none; }
        .tabTrigger[data-state='active'] {
          background: var(--highlight);
          transform: translateY(-2px);
        }
        .tabTrigger strong { font-size: 13px; }
        .tabMeta { font-size: 10px; color: var(--muted); }
        .tabPanel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 124px;
          gap: 16px;
          align-items: start;
          padding-top: 8px;
        }
        .tabPanel p { font-size: 14px; line-height: 1.55; color: var(--secondary); }
        .tabAside {
          background: var(--folio);
          border: 1px solid var(--border);
          padding: 12px;
          display: grid;
          gap: 6px;
        }
        .tabAside strong { font-family: 'Cormorant Garamond', serif; font-size: 28px; line-height: 0.9; }
        .subscription {
          grid-column: 9 / -1;
          padding: 18px;
          display: grid;
          gap: 16px;
          min-height: 292px;
        }
        .checkRow { display: flex; align-items: center; gap: 10px; }
        .checkboxRoot {
          width: 18px;
          height: 18px;
          border: 1px solid var(--border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,253,248,0.9);
        }
        .checkboxRoot[data-state='checked'] { background: var(--highlight); }
        .checkboxIndicator { font-size: 12px; line-height: 1; }
        .subscriptionCta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .stampButton {
          border: 1px solid var(--border);
          padding: 12px 14px;
          background: var(--highlight);
          box-shadow: 3px 3px 0 rgba(30,30,30,0.08);
          font-size: 11px;
        }
        .ghostButton {
          border: 1px solid var(--border);
          padding: 12px 14px;
          background: rgba(255,253,248,0.74);
          font-size: 11px;
        }
        .archive {
          grid-column: 1 / span 7;
          padding: 18px;
          display: grid;
          gap: 16px;
        }
        .sectionHeader {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: end;
        }
        .sectionNumber {
          font-family: 'Cormorant Garamond', serif;
          font-size: 76px;
          line-height: 0.8;
          color: var(--accent);
        }
        .sectionHeader .sectionLine {
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .archiveTable {
          display: grid;
          border-top: 1px solid var(--border);
        }
        .tableRow {
          display: grid;
          grid-template-columns: 80px minmax(0, 1.2fr) 130px 1fr 70px;
          gap: 12px;
          align-items: start;
          padding: 12px 0;
          border-bottom: 1px solid rgba(30,30,30,0.16);
        }
        .tableRow strong { display: block; font-size: 14px; }
        .tableRow p { font-size: 12px; color: var(--secondary); line-height: 1.45; }
        .tinyMeta { font-size: 10px; color: var(--muted); }
        .accordionPanel {
          grid-column: 8 / -1;
          display: grid;
          gap: 0;
          border: 1px solid var(--border);
          background: rgba(255,253,248,0.96);
        }
        .accordionItem + .accordionItem { border-top: 1px solid var(--border); }
        .accordionTrigger {
          width: 100%;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 16px 18px;
          text-align: left;
          background: none;
        }
        .accordionTrigger .sectionNumber { font-size: 48px; }
        .accordionTrigger h4 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          line-height: 0.95;
        }
        .accordionContent {
          overflow: hidden;
        }
        .accordionContent[data-state='open'] {
          animation: slideDown var(--duration) var(--ease);
        }
        .accordionContent[data-state='closed'] {
          animation: slideUp var(--duration) var(--ease);
        }
        .accordionInner {
          padding: 0 18px 18px 78px;
          display: grid;
          gap: 14px;
        }
        .infoGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 112px;
          gap: 16px;
        }
        .infoGrid p { font-size: 13px; line-height: 1.55; color: var(--secondary); }
        .infoStamp {
          background: var(--sage);
          border: 1px solid var(--border);
          padding: 12px;
          display: grid;
          gap: 4px;
          align-content: start;
        }
        .dialogOverlay {
          position: fixed;
          inset: 0;
          background: rgba(17,17,17,0.38);
          backdrop-filter: blur(1px);
        }
        .dialogContent {
          position: fixed;
          left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: min(520px, calc(100vw - 32px));
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: 20px;
          display: grid;
          gap: 16px;
        }
        .dialogContent h4 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          line-height: 0.92;
        }
        .formGrid { display: grid; gap: 12px; }
        .fieldLabel { font-size: 10px; color: var(--muted); }
        .ruledField {
          border-bottom: 1px solid var(--border);
          padding: 10px 0;
          font-size: 14px;
        }
        .footerBand {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 18px;
          margin-top: 4px;
        }
        .footerBand p { font-size: 12px; color: var(--secondary); }
        .focusable:focus-visible, button:focus-visible, [role='button']:focus-visible, input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .tiltPlus:hover { transform: rotate(-4deg) translateY(-2px); }
        .storyCard:hover, .tabTrigger:hover, .stampButton:hover, .ghostButton:hover, .selectTrigger:hover {
          transform: translateY(-2px);
          transition: transform var(--duration) var(--ease), background var(--duration) var(--ease);
        }
        @keyframes slideDown { from { height: 0; opacity: 0.4; } to { height: var(--radix-accordion-content-height); opacity: 1; } }
        @keyframes slideUp { from { height: var(--radix-accordion-content-height); opacity: 1; } to { height: 0; opacity: 0.4; } }
        @media (max-width: 1199px) {
          .spread { grid-template-columns: repeat(8, minmax(0, 1fr)); }
          .masthead { grid-template-columns: 1fr; }
          .mastMeta { justify-content: start; }
          .mainFeature { grid-column: 1 / -1; }
          .subgrid { grid-column: 1 / -1; grid-template-columns: repeat(8, minmax(0, 1fr)); }
          .schedule { grid-column: span 4; }
          .storyPanel { grid-column: span 2; }
          .quote { grid-column: 1 / span 3; }
          .insightPanel { grid-column: 4 / span 3; }
          .subscription { grid-column: 7 / span 2; }
          .archive { grid-column: 1 / span 5; }
          .accordionPanel { grid-column: 6 / -1; }
        }
        @media (max-width: 699px) {
          .pageShell { padding: 14px; }
          .spread { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
          .masthead, .mainFeature, .subgrid, .quote, .insightPanel, .subscription, .archive, .accordionPanel, .footerBand { grid-column: 1 / -1; }
          .wordmark { grid-template-columns: 1fr; gap: 8px; }
          .mainFeature { grid-template-columns: 1fr; }
          .featureStory { border-right: none; border-bottom: 1px solid var(--border); }
          .rotateSticker { top: 130px; right: 16px; }
          .imageBand, .tabPanel, .infoGrid, .tableRow, .sectionHeader { grid-template-columns: 1fr; }
          .subgrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .schedule, .storyPanel { grid-column: span 4; }
          .quote { grid-template-columns: auto 1fr; }
          .quoteMeta { grid-column: 2; text-align: left; }
          .tabsList { grid-template-columns: 1fr; }
          .tabTrigger { border-right: none; border-bottom: 1px solid var(--border); }
          .archiveTable { gap: 10px; }
          .tableRow { border: 1px solid rgba(30,30,30,0.16); padding: 12px; background: rgba(255,253,248,0.6); }
          .accordionInner { padding-left: 18px; }
        }
      `}</style>

      <div className="spread">
        <header className="masthead">
          <div className="wordmark">
            <div className="folioBig">09</div>
            <div className="titleBlock">
              <div className="kicker">Issue / Kukan Press Grid / City Reader</div>
              <h1>Fragments of the late-city edition arranged as a spread</h1>
              <p>
                A reading dashboard for district notes, pop-up screenings, and print-led culture listings.
                The interface behaves like an edited paper: dense, paced, and stitched together by captions,
                folios, stamps, and sidebars rather than one oversized hero gesture.
              </p>
            </div>
          </div>
          <div className="mastMeta metaText">
            <span className="pill">Vol. 31 / 14 stories</span>
            <span className="pill">Tokyo commuter culture / weekly</span>
            <span className="pill">Updated 18:40 JST</span>
          </div>
        </header>

        <section className="feature mainFeature feature">
          <div className="rotateSticker stamp tiltPlus">District sticker / {activeDistrict.code}</div>
          <div className="featureStory">
            <div className="featureHeader">
              <div className="kicker">Lead Feature / Platform 2 / 7 min</div>
              <div className="metaText">Essay + listings + field notes</div>
            </div>
            <h2 className="featureTitle">Night markets are turning timetable gaps into editorial scenes</h2>
            <p className="lede">
              Transit paper kiosks now share attention with neighborhood boards, micro cinemas, and folded event sheets.
              Instead of one campaign, the district accumulates evidence: issue numbers, timestamps, voice memos, and cropped images that read as argument.
            </p>
            <div>
              <div className="imageBand">
                <div className="imgMain" />
                <div className="imgSliceWrap">
                  <div className="imgSlice" />
                  <div className="imgStrip" />
                </div>
              </div>
              <div className="captionRow">
                <p>
                  Cropped windows privilege texture over spectacle: train glass, paper stacks, corner posters, and reflected neon become compositional evidence.
                </p>
                <div className="noteChip metaText">Offset note / crop logic preserved</div>
              </div>
            </div>
            <div className="metaText" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>Issue 244</span>
              <span>Edited by urban desk</span>
              <span>Photo strips / 3</span>
            </div>
          </div>
          <aside className="supportRail rail">
            <div className="kicker">Adjacent notes / district pulse</div>
            <p className="railNote">
              {activeDistrict.note}
            </p>
            <div className="statStack">
              <div className="statItem"><strong>18</strong><span>venues cross-listed</span></div>
              <div className="statItem"><strong>06</strong><span>midnight print drops</span></div>
              <div className="statItem"><strong>42%</strong><span>readers saving route notes</span></div>
            </div>
            <div className="districtStamp metaText">{activeDistrict.stamp}</div>
          </aside>
        </section>

        <div className="subgrid">
          <section className="schedule">
            <div className="scheduleHeader">
              <div>
                <div className="kicker">Desk schedule / by district</div>
                <h3>Tonight's field log</h3>
              </div>
              <span className="metaText">{activeDistrict.line}</span>
            </div>
            <Select.Root value={district} onValueChange={setDistrict}>
              <Select.Trigger className="selectTrigger focusable" aria-label="Select district">
                <Select.Value />
                <Select.Icon>＋</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="selectContent" position="popper">
                  <Select.Viewport className="selectViewport">
                    <Select.Item value="koenji" className="selectItem">Koenji</Select.Item>
                    <Select.Item value="kanda" className="selectItem">Kanda</Select.Item>
                    <Select.Item value="shimokitazawa" className="selectItem">Shimokitazawa</Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <div className="agendaList">
              <div className="agendaItem"><div className="agendaTime">18:30</div><div><h4>Station concourse fold-out issue lands beside gallery tickets</h4><p>Readers compare map notes, tiny reviews, and opening times before choosing a route.</p></div></div>
              <div className="agendaItem"><div className="agendaTime">20:10</div><div><h4>Listening bar publishes one-night set list as a paper insert</h4><p>Mono metadata and small district tags keep the handout readable under low light.</p></div></div>
              <div className="agendaItem"><div className="agendaTime">22:40</div><div><h4>Screening venue reuses archive captions as queue-side programming</h4><p>Old folio marks return as wayfinding, making history part of the live service.</p></div></div>
            </div>
            <Separator.Root decorative orientation="horizontal" style={{ height: '1px', background: 'rgba(30,30,30,0.18)' }} />
            <div className="metaText districtStamp">Field code / {activeDistrict.code} / readers bookmarking route notes</div>
          </section>

          <section className="storyPanel">
            <article className="storyCard panel">
              <div className="kicker">Side story / print systems</div>
              <h3>Ticket stubs become archive indexes</h3>
              <div className="miniImage" />
              <p>Receipts, stamps, and small venue marks are promoted into first-class metadata rather than discarded ephemera.</p>
            </article>
            <article className="storyCard panel">
              <div className="kicker">Notebook / kiosks</div>
              <h3>Slender windows make images feel selected</h3>
              <p>Vertical slices stop photos from acting like generic thumbnails and make every crop read like editorial intent.</p>
              <div className="miniImage" style={{ minHeight: '154px' }} />
            </article>
          </section>
        </div>

        <section className="quote">
          <div className="quoteNumber">02</div>
          <blockquote>Readers trust dense pages when the rules, labels, and pauses feel edited.</blockquote>
          <div className="quoteMeta metaText">Pull quote / pacing band / issue memo</div>
        </section>

        <section className="insightPanel">
          <div>
            <div className="kicker">Section band / observations</div>
            <h3>Signals arranged for lateral reading</h3>
          </div>
          <Tabs.Root defaultValue="flow">
            <Tabs.List className="tabsList" aria-label="Reading modes">
              <Tabs.Trigger className="tabTrigger focusable" value="flow"><strong>Flow</strong><span className="tabMeta">adjacency</span></Tabs.Trigger>
              <Tabs.Trigger className="tabTrigger focusable" value="proof"><strong>Proof</strong><span className="tabMeta">captions</span></Tabs.Trigger>
              <Tabs.Trigger className="tabTrigger focusable" value="timing"><strong>Timing</strong><span className="tabMeta">cadence</span></Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content className="tabPanel" value="flow">
              <p>Modules gain meaning from sequence. A quote band, a cropped feature, and a narrow stats rail create a chain of entry points instead of one funnel.</p>
              <div className="tabAside"><strong>12</strong><span className="tinyMeta">visible metadata cues</span></div>
            </Tabs.Content>
            <Tabs.Content className="tabPanel" value="proof">
              <p>Top kicker strips and ruled edges create trust. The page feels published because every cluster declares category, issue, location, and editorial role.</p>
              <div className="tabAside"><strong>07</strong><span className="tinyMeta">bands before major stories</span></div>
            </Tabs.Content>
            <Tabs.Content className="tabPanel" value="timing">
              <p>Open gutters and paper bands are not empty; they act as breathing marks between dense clusters so the reading field never collapses into noise.</p>
              <div className="tabAside"><strong>18px</strong><span className="tinyMeta">governing gutter</span></div>
            </Tabs.Content>
          </Tabs.Root>
        </section>

        <section className="subscription">
          <div>
            <div className="kicker">Editorial controls / stamped actions</div>
            <h3>Save the night edition without breaking the paper rhythm</h3>
          </div>
          <div className="checkRow">
            <Checkbox.Root className="checkboxRoot focusable" checked={saved} onCheckedChange={function (v) { setSaved(v === true); }} aria-label="Save route notes">
              <Checkbox.Indicator className="checkboxIndicator">✓</Checkbox.Indicator>
            </Checkbox.Root>
            <span>Archive route notes for the next issue</span>
          </div>
          <div className="checkRow">
            <Checkbox.Root className="checkboxRoot focusable" checked={nightEdition} onCheckedChange={function (v) { setNightEdition(v === true); }} aria-label="Enable night edition">
              <Checkbox.Indicator className="checkboxIndicator">✓</Checkbox.Indicator>
            </Checkbox.Root>
            <span>Receive late-edition insert after 21:00</span>
          </div>
          <div className="subscriptionCta">
            <Dialog.Root>
              <Dialog.Trigger className="stampButton focusable">Reserve issue packet</Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialogOverlay" />
                <Dialog.Content className="dialogContent focusable">
                  <div>
                    <div className="kicker">Reservation / folio desk</div>
                    <h4>Hold one printed bundle for station pickup</h4>
                  </div>
                  <div className="formGrid">
                    <label>
                      <div className="fieldLabel">Reader name</div>
                      <input className="ruledField focusable" value="Aiko Morita" readOnly />
                    </label>
                    <label>
                      <div className="fieldLabel">Pickup window</div>
                      <input className="ruledField focusable" value="19:30–20:10 / Central Gate" readOnly />
                    </label>
                    <label>
                      <div className="fieldLabel">Bundle contents</div>
                      <textarea className="ruledField focusable" rows={3} value={'Night edition, district insert, annotated timetable, one archive card'} readOnly />
                    </label>
                  </div>
                  <div className="subscriptionCta">
                    <Dialog.Close className="stampButton focusable">Stamp reservation</Dialog.Close>
                    <Dialog.Close className="ghostButton focusable">Return to spread</Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <button className="ghostButton focusable">Browse archive cards</button>
          </div>
          <div className="metaText">State / saved notes: {saved ? 'on' : 'off'} / night insert: {nightEdition ? 'on' : 'off'}</div>
        </section>

        <section className="archive">
          <div className="sectionHeader">
            <div className="sectionNumber">03</div>
            <div>
              <div className="sectionLine">Archive divider / ruled sequence</div>
              <h3>Issue fragments still working after publication</h3>
            </div>
          </div>
          <div className="archiveTable">
            <div className="tableRow metaText"><span>Issue</span><span>Story</span><span>District</span><span>Editorial note</span><span>Read</span></div>
            <div className="tableRow"><div className="tinyMeta">241</div><div><strong>Corner bookstores become event desks</strong><p>Margins host handwritten venue corrections and become part of the reading experience.</p></div><div className="tinyMeta">KJ-08</div><div><p>Metadata surfaced in the header, not hidden in hover states.</p></div><div className="tinyMeta">5m</div></div>
            <div className="tableRow"><div className="tinyMeta">238</div><div><strong>Folio numerals guide neighborhood jumps</strong><p>Large serif numbers divide sections while thin rules keep the page from feeling theatrical.</p></div><div className="tinyMeta">KD-03</div><div><p>Sage sidebars held transit ratios and queue notes beside the main essay.</p></div><div className="tinyMeta">8m</div></div>
            <div className="tableRow"><div className="tinyMeta">232</div><div><strong>Posters photographed as cropped evidence</strong><p>Only fragments of image, tape, and wall texture are shown, making the crop itself editorial.</p></div><div className="tinyMeta">SM-12</div><div><p>Captions did the explanatory work; images remained sharp and restrained.</p></div><div className="tinyMeta">6m</div></div>
          </div>
        </section>

        <Accordion.Root className="accordionPanel" type="single" defaultValue="item-1" collapsible>
          <Accordion.Item className="accordionItem" value="item-1">
            <Accordion.Header>
              <Accordion.Trigger className="accordionTrigger focusable">
                <span className="sectionNumber">04</span>
                <div>
                  <div className="sectionLine">Reading notes</div>
                  <h4>Why the controls feel editorial instead of generic</h4>
                </div>
                <span className="metaText">open</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordionContent">
              <div className="accordionInner">
                <div className="infoGrid">
                  <p>Selectors, checkboxes, and dialogs are treated like stamped paper forms. Borders stay crisp, labels stay visible, and typography keeps its role distinction: serif for emphasis, gothic for body, mono for metadata and controls.</p>
                  <div className="infoStamp"><strong>UI</strong><span className="tinyMeta">explicitly styled</span></div>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item className="accordionItem" value="item-2">
            <Accordion.Header>
              <Accordion.Trigger className="accordionTrigger focusable">
                <span className="sectionNumber">05</span>
                <div>
                  <div className="sectionLine">Image logic</div>
                  <h4>How cropped slices keep the spread feeling authored</h4>
                </div>
                <span className="metaText">inspect</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordionContent">
              <div className="accordionInner">
                <div className="infoGrid">
                  <p>Instead of one passive full-bleed photo, the layout uses a large primary crop with two narrow companions. This introduces comparison and pacing while staying within a rigid module boundary.</p>
                  <div className="infoStamp"><strong>3</strong><span className="tinyMeta">distinct crop shapes</span></div>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item className="accordionItem" value="item-3">
            <Accordion.Header>
              <Accordion.Trigger className="accordionTrigger focusable">
                <span className="sectionNumber">06</span>
                <div>
                  <div className="sectionLine">Responsiveness</div>
                  <h4>What remains visible on smaller screens</h4>
                </div>
                <span className="metaText">adapt</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordionContent">
              <div className="accordionInner">
                <div className="infoGrid">
                  <p>Every story keeps its top metadata band. Side notes become full-width paper strips, tabs stack vertically, and the issue sequence remains obvious through folio numerals and rules instead of giant decorative banners.</p>
                  <div className="infoStamp"><strong>3</strong><span className="tinyMeta">breakpoints honored</span></div>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>

        <footer className="footerBand">
          <p>Editorial grid / paper surfaces / active gutters / clipped image windows / contained accents</p>
          <div className="metaText">Kukan Press Grid / responsive spread specimen / Radix UI controls</div>
        </footer>
      </div>
    </div>
  );
}

export { KukanPressGrid as KukanPressGridRadix };
export default KukanPressGrid;
