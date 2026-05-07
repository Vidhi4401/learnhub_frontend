// All raw data
let allCourses     = [];
let allAttempts    = [];
let allSubmissions = [];
let allVideoProg   = [];

function applyChartThemeDefaults() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f1f5f9' : '#374151';
  const gridColor = isDark ? '#334155' : '#f3f4f6';
  if (window.Chart && Chart.defaults) {
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;
  }
  return { textColor, gridColor };
}

// ── Badge color helper — uses rgba so it works in dark AND light mode ──
function getLevelStyle(level) {
  const map = {
    'Strong':  { bg: 'rgba(22,163,74,0.15)',   color: '#4ade80'  },
    'Average': { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24'  },
    'Weak':    { bg: 'rgba(239,68,68,0.15)',   color: '#f87171'  },
  };
  return map[level] || map['Weak'];
}

function getRiskStyle(risk) {
  const map = {
    'High':   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171'  },
    'Medium': { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24'  },
    'Low':    { bg: 'rgba(22,163,74,0.15)',   color: '#4ade80'  },
  };
  return map[risk] || map['Low'];
}

function applyLevelBadge(el, descEl, level) {
  if (!el) return;
  const s = getLevelStyle(level);
  el.textContent = level;
  el.style.background = s.bg;
  el.style.color = s.color;
  el.style.padding = '4px 14px';
  el.style.borderRadius = '20px';
  el.style.fontWeight = '700';
  el.style.fontSize = '15px';
  if (descEl) {
    if (level === 'Strong')       descEl.textContent = 'Outstanding work! High engagement.';
    else if (level === 'Average') descEl.textContent = 'Good progress. On the right track.';
    else                          descEl.textContent = 'Foundational review recommended.';
  }
}

function applyRiskBadge(el, risk) {
  if (!el) return;
  const s = getRiskStyle(risk);
  el.textContent = `Dropout Risk: ${risk}`;
  el.style.display = 'inline-block';
  el.style.background = s.bg;
  el.style.color = s.color;
  el.style.padding = '4px 14px';
  el.style.borderRadius = '20px';
  el.style.fontWeight = '700';
  el.style.fontSize = '13px';
}

let courseChart = null;
let skillChart  = null;
let videoDonut  = null;
let assignDonut = null;
let quizDonut   = null;

document.addEventListener("DOMContentLoaded", loadAll);

/* ============================================================
   LOAD ALL DATA
============================================================*/
async function loadAll() {
  try {
    const token = localStorage.getItem("token");

    const enrRes = await fetch(`${API}/student/enrollments`, {
      headers: { Authorization: "Bearer " + token }
    });
    const enrollments = enrRes.ok ? await enrRes.json() : [];

    allCourses = (await Promise.all(
      enrollments.map(e =>
        fetch(`${API}/student/courses/${e.course_id}/detail`, {
          headers: { Authorization: "Bearer " + token }
        }).then(r => r.ok ? r.json() : null)
      )
    )).filter(Boolean);

    const attRes = await fetch(`${API}/student/quiz-attempts`, {
      headers: { Authorization: "Bearer " + token }
    });
    allAttempts = attRes.ok ? await attRes.json() : [];

    const subRes = await fetch(`${API}/student/assignment-submissions`, {
      headers: { Authorization: "Bearer " + token }
    });
    allSubmissions = subRes.ok ? await subRes.json() : [];

    const vpRes = await fetch(`${API}/student/video-progress-all`, {
      headers: { Authorization: "Bearer " + token }
    });
    allVideoProg = vpRes.ok ? await vpRes.json() : [];

    const sel = document.getElementById("courseFilter");
    if (sel) {
      allCourses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id; opt.textContent = c.title;
        sel.appendChild(opt);
      });
    }

    renderAll("all");

  } catch (err) {
    console.error("loadAll error:", err);
  }
}

/* ============================================================
   FILTER
============================================================*/
function applyFilter() {
  renderAll(document.getElementById("courseFilter").value);
}

/* ============================================================
   RENDER ALL
============================================================*/
function renderAll(courseFilter) {
  const courses = courseFilter === "all"
    ? allCourses
    : allCourses.filter(c => String(c.id) === String(courseFilter));

  const quizIds   = new Set();
  const assignIds = new Set();
  const videoIds  = new Set();

  courses.forEach(c => {
    c.topics?.forEach(t => {
      t.quizzes?.forEach(q     => quizIds.add(q.id));
      t.assignments?.forEach(a => assignIds.add(a.id));
      t.videos?.forEach(v      => videoIds.add(v.id));
    });
  });

  const attempts    = allAttempts.filter(a    => quizIds.has(a.quiz_id));
  const submissions = allSubmissions.filter(s => assignIds.has(s.assignment_id));

  const quizAvg   = avg(attempts.map(a => a.percentage || 0));
  const assignAvg = avg(submissions.map(s => {
    const a = allCourses.flatMap(c => c.topics || [])
      .flatMap(t => t.assignments || [])
      .find(x => x.id === s.assignment_id);
    return a ? ((s.obtained_marks || 0) / (a.total_marks || 1)) * 100 : 0;
  }));

  const totalVideos     = videoIds.size;
  const scopedVideoProg = allVideoProg.filter(p => videoIds.has(p.video_id));
  const completedVids   = scopedVideoProg.filter(p => (p.watch_percentage || 0) >= 80).length;
  const videoCompPct    = totalVideos > 0 ? Math.round((completedVids / totalVideos) * 100) : 0;

  const totalQuizzes   = quizIds.size;
  const quizAttemptPct = totalQuizzes > 0 ? Math.round((attempts.length / totalQuizzes) * 100) : 0;
  const totalAssigns   = assignIds.size;
  const subPct         = totalAssigns > 0 ? Math.round((submissions.length / totalAssigns) * 100) : 0;

  const overallPct = avg([quizAvg, assignAvg, videoCompPct].filter(x => x > 0)) || 0;

  // ── Local level for immediate display (before DB sync returns) ──
  let displayLevel = overallPct >= 70 ? "Strong" : overallPct >= 40 ? "Average" : "Weak";
  applyLevelBadge(
    document.getElementById("aiLearnerLevel"),
    document.getElementById("levelDesc"),
    displayLevel
  );

  // ── When filtering per course — show course-specific level ──
  // Risk stays overall (only shown for "all" filter or from DB)
  if (courseFilter !== "all") {
    const riskEl = document.getElementById("dropoutRiskBadge");
    if (riskEl) {
      riskEl.style.display = 'none'; // hide risk badge for per-course view — it's not meaningful
    }
    // Show course-specific context note
    const descEl = document.getElementById("levelDesc");
    if (descEl) descEl.textContent += ` (for this course)`;
  }

  // ── Stat Cards ──
  document.getElementById("statOverall").textContent    = fmt(overallPct);
  document.getElementById("statCompletion").textContent = fmt(videoCompPct);
  document.getElementById("statQuiz").textContent       = fmt(quizAvg);
  document.getElementById("statAssign").textContent     = fmt(assignAvg);

  // ── ML Sync — ONLY for "all" filter with overall stats ──
  if (courseFilter === "all") {
    const avgWatchTime = scopedVideoProg.length > 0
      ? avg(scopedVideoProg.map(p => p.watch_time || 0))
      : 0;

    syncPerformanceToDB({
      overall_score:              parseFloat(overallPct.toFixed(1)),
      quiz_average:               parseFloat(quizAvg.toFixed(1)),
      assignment_average:         parseFloat(assignAvg.toFixed(1)),
      completion_rate:            parseFloat(videoCompPct.toFixed(1)),
      avg_watch_time:             parseFloat(avgWatchTime.toFixed(1)),
      quiz_attempt_rate:          parseFloat(quizAttemptPct.toFixed(1)),
      assignment_submission_rate: parseFloat(subPct.toFixed(1)),
      videos_completed:           parseInt(completedVids),
      quizzes_attempted:          parseInt(attempts.length),
      assignments_submitted:      parseInt(submissions.length),
      total_course_items:         parseInt(totalVideos + totalQuizzes + totalAssigns),
      is_global: true
    });
  }

  // ── Charts ──
  try {
    window._perfCourses     = courses;
    window._perfAttempts    = attempts;
    window._perfSubmissions = submissions;
    renderCourseChart(courses, attempts, submissions);
    renderSkillChart(courses, attempts, submissions);
    renderEngagement(courses, attempts, submissions, videoIds);

    if (courseFilter !== "all") {
      fetchSkillGap(courseFilter);
    } else {
      renderInsights(quizAvg, assignAvg, videoCompPct, attempts, submissions, courses);
    }
  } catch (err) {
    console.error("Chart rendering error:", err);
  }
}

/* ============================================================
   SKILL GAP (per course AI analysis)
============================================================*/
async function fetchSkillGap(courseId) {
  const sList  = document.getElementById("strengthsList");
  const iList  = document.getElementById("improveList");
  const aList  = document.getElementById("actionsList");
  const mBanner= document.getElementById("motivateBanner");

  if (sList)   sList.innerHTML   = '<li>Analyzing...</li>';
  if (iList)   iList.innerHTML   = '<li>Analyzing...</li>';
  if (aList)   aList.innerHTML   = '<li>Generating recommendations...</li>';
  if (mBanner) mBanner.innerHTML = '<span>Llama-3 is analyzing your performance...</span>';

  try {
    const token = localStorage.getItem("token");
    const res   = await fetch(`${API}/student/skill-gap/${courseId}`, {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();

    if (data.error) {
      if (sList) sList.innerHTML = '<li>Analysis currently unavailable.</li>';
      return;
    }

    if (sList) sList.innerHTML = data.strengths?.map(s => `<li>${s}</li>`).join("") || "<li>Complete more tasks to see strengths!</li>";
    if (iList) iList.innerHTML = data.weaknesses?.map(w => `<li>${w}</li>`).join("") || "<li>Looking good! No major gaps found.</li>";

    if (aList) {
      if (data.recovery_plan?.length > 0) {
        aList.innerHTML = data.recovery_plan.map(p => `
          <li style="margin-bottom:12px;">
            <strong style="color:var(--ink);">${p.topic}:</strong> ${p.action}
            ${p.video_suggestion ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">💡 ${p.video_suggestion}</div>` : ""}
          </li>
        `).join("");
      } else {
        aList.innerHTML = "<li>Keep up the excellent work! Stay consistent.</li>";
      }
    }

    if (mBanner) {
      if (data.review_guide) {
        mBanner.innerHTML = `
          <div style="background:var(--page-bg);padding:12px;border-radius:8px;margin-bottom:12px;border-left:4px solid #3b82f6;">
            <div style="font-weight:700;font-size:13px;color:var(--ink);margin-bottom:4px;">📘 MINI-REVIEW GUIDE</div>
            <div style="font-size:14px;color:var(--ink);">${data.review_guide}</div>
          </div>
          <strong>AI Insight:</strong> <span>${data.motivation}</span>
        `;
      } else {
        mBanner.innerHTML = `<strong>AI Insight:</strong> <span>${data.motivation || ''}</span>`;
      }
    }

  } catch (err) {
    console.error("Skill gap fetch failed", err);
  }
}

/* ============================================================
   COURSE CHART
============================================================*/
function renderCourseChart(courses, attempts, submissions) {
  const labels = [], assignData = [], quizData = [];

  courses.forEach(c => {
    const qIds = new Set(c.topics?.flatMap(t => t.quizzes?.map(q => q.id) || []) || []);
    const aIds = new Set(c.topics?.flatMap(t => t.assignments?.map(a => a.id) || []) || []);

    const courseAttempts    = attempts.filter(a    => qIds.has(a.quiz_id));
    const courseSubmissions = submissions.filter(s => aIds.has(s.assignment_id));

    const qAvg = avg(courseAttempts.map(a => a.percentage || 0));
    const aAvg = avg(courseSubmissions.map(s => {
      const a = c.topics?.flatMap(t => t.assignments || []).find(x => x.id === s.assignment_id);
      return a ? ((s.obtained_marks || 0) / (a.total_marks || 1)) * 100 : 0;
    }));

    if (qAvg > 0 || aAvg > 0) {
      labels.push(c.title.length > 18 ? c.title.substring(0, 16) + "…" : c.title);
      assignData.push(Math.round(aAvg));
      quizData.push(Math.round(qAvg));
    }
  });

  const isEmpty = labels.length === 0;
  const emptyEl = document.getElementById("courseEmpty");
  const chartEl = document.getElementById("courseChart");
  if (emptyEl) emptyEl.style.display = isEmpty ? "block" : "none";
  if (chartEl) chartEl.style.display = isEmpty ? "none"  : "block";
  if (isEmpty || !chartEl) return;

  if (courseChart) courseChart.destroy();
  const ct = applyChartThemeDefaults();
  courseChart = new Chart(chartEl, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Assignment %", data: assignData, backgroundColor: "#3b82f6", borderRadius: 6 },
        { label: "Quiz %",       data: quizData,   backgroundColor: "#8b5cf6", borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: ct.textColor, font: { size: 12 } } } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: ct.textColor, callback: v => v + "%" }, grid: { color: ct.gridColor } },
        x: { ticks: { color: ct.textColor }, grid: { display: false } }
      }
    }
  });
}

/* ============================================================
   SKILL CHART
============================================================*/
function renderSkillChart(courses, attempts, submissions) {
  const topicScores = [];

  courses.forEach(c => {
    c.topics?.forEach(t => {
      const qIds = new Set(t.quizzes?.map(q => q.id) || []);
      const aIds = new Set(t.assignments?.map(a => a.id) || []);

      const tAttempts    = attempts.filter(a    => qIds.has(a.quiz_id));
      const tSubmissions = submissions.filter(s => aIds.has(s.assignment_id));

      const scores = [
        ...tAttempts.map(a => a.percentage || 0),
        ...tSubmissions.map(s => {
          const a = t.assignments?.find(x => x.id === s.assignment_id);
          return a ? ((s.obtained_marks || 0) / (a.total_marks || 1)) * 100 : 0;
        })
      ];
      if (scores.length > 0) {
        topicScores.push({ label: t.title, score: Math.round(avg(scores)) });
      }
    });
  });

  topicScores.sort((a, b) => b.score - a.score);
  const top = topicScores.slice(0, 10);

  const isEmpty = top.length === 0;
  const emptyEl = document.getElementById("skillEmpty");
  const chartEl = document.getElementById("skillChart");
  if (emptyEl) emptyEl.style.display = isEmpty ? "block" : "none";
  if (chartEl) chartEl.style.display = isEmpty ? "none"  : "block";
  if (isEmpty || !chartEl) return;

  const colors = top.map(t => t.score >= 80 ? "#10b981" : t.score >= 60 ? "#f59e0b" : "#ef4444");

  if (skillChart) skillChart.destroy();
  const ct = applyChartThemeDefaults();
  skillChart = new Chart(chartEl, {
    type: "bar",
    data: {
      labels: top.map(t => t.label.length > 14 ? t.label.substring(0, 12) + "…" : t.label),
      datasets: [{ label: "Accuracy (%)", data: top.map(t => t.score), backgroundColor: colors, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: ct.textColor, callback: v => v + "%" }, grid: { color: ct.gridColor } },
        x: { ticks: { color: ct.textColor, font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

/* ============================================================
   ENGAGEMENT
============================================================*/
function renderEngagement(courses, attempts, submissions, videoIds) {
  const totalQuizzes     = new Set(courses.flatMap(c => c.topics?.flatMap(t => t.quizzes?.map(q => q.id)||[])||[])).size;
  const attemptedQuizzes = attempts.length;
  const quizAttemptPct   = totalQuizzes > 0 ? Math.round((attemptedQuizzes / totalQuizzes) * 100) : 0;
  const quizScoreAvg     = Math.round(avg(attempts.map(a => a.percentage || 0)));

  setDonut("quizDonut", attemptedQuizzes, totalQuizzes, "#14b8a6");
  setText("quizCenter",    `${attemptedQuizzes}/${totalQuizzes}`);
  setBar("quizBar",        quizAttemptPct);
  setText("quizPct",       quizAttemptPct + "%");
  setBar("quizScoreBar",   quizScoreAvg);
  setText("quizScorePct",  quizScoreAvg + "%");
  setText("quizAttempted", attemptedQuizzes);
  setText("quizTotal",     totalQuizzes);

  const totalAssigns   = new Set(courses.flatMap(c => c.topics?.flatMap(t => t.assignments?.map(a=>a.id)||[])||[])).size;
  const submittedCount = submissions.length;
  const subPct         = totalAssigns > 0 ? Math.round((submittedCount / totalAssigns) * 100) : 0;
  const assignScoreAvg = Math.round(avg(submissions.map(s => {
    const a = courses.flatMap(c => c.topics||[]).flatMap(t => t.assignments||[]).find(x => x.id === s.assignment_id);
    return a ? ((s.obtained_marks||0) / (a.total_marks||1)) * 100 : 0;
  })));

  setDonut("assignDonut", submittedCount, totalAssigns, "#8b5cf6");
  setText("assignCenter",    `${submittedCount}/${totalAssigns}`);
  setBar("assignBar",        subPct);
  setText("assignPct",       subPct + "%");
  setBar("assignScoreBar",   assignScoreAvg);
  setText("assignScorePct",  assignScoreAvg + "%");
  setText("assignSubmitted", submittedCount);
  setText("assignPending",   Math.max(0, totalAssigns - submittedCount));

  const totalVids      = videoIds.size;
  const scopedProgress = allVideoProg.filter(p => videoIds.has(p.video_id));
  const completedVids  = scopedProgress.filter(p => (p.watch_percentage || 0) >= 80).length;
  const videoCompPct   = totalVids > 0 ? Math.round((completedVids / totalVids) * 100) : 0;
  const avgWatch       = scopedProgress.length > 0 ? Math.round(avg(scopedProgress.map(p => p.watch_percentage || 0))) : 0;

  setDonut("videoDonut", completedVids, totalVids, "#3b82f6");
  setText("videoCenter", `${completedVids}/${totalVids}`);
  setBar("videoBar",     videoCompPct);
  setText("videoPct",    videoCompPct + "%");
  setBar("watchBar",     avgWatch);
  setText("watchPct",    avgWatch + "%");
  setText("videoWeek",   completedVids);
  setText("videoTotal",  totalVids);
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setBar(id, pct)  { const el = document.getElementById(id); if (el) el.style.width = pct + "%"; }

/* ============================================================
   DONUT HELPER
============================================================*/
function setDonut(canvasId, done, total, color) {
  const remaining = Math.max(0, total - done);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  try {
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();
    new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [done, remaining || 0.0001],
          backgroundColor: [
            color,
            document.documentElement.getAttribute("data-theme") === "dark" ? "#334155" : "#e5e7eb"
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: "72%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  } catch (err) {
    console.error(`[Donut] ${canvasId}:`, err);
  }
}

/* ============================================================
   INSIGHTS (All courses view)
============================================================*/
function renderInsights(quizAvg, assignAvg, videoCompPct, attempts, submissions, courses) {
  const strengths    = [];
  const improvements = [];
  const actions      = [];

  if (quizAvg >= 75)       strengths.push("Strong quiz performance with consistent scores");
  if (assignAvg >= 75)     strengths.push("Excellent assignment scores");
  if (videoCompPct >= 70)  strengths.push("Good video engagement and completion rate");

  const weakTopics = [];
  courses.forEach(c => {
    c.topics?.forEach(t => {
      const qIds = new Set(t.quizzes?.map(q => q.id)||[]);
      const topicAttempts = attempts.filter(a => qIds.has(a.quiz_id));
      if (topicAttempts.length > 0 && avg(topicAttempts.map(a => a.percentage||0)) < 60) {
        weakTopics.push(t.title);
      }
    });
  });

  const pendingAssigns = courses.flatMap(c => c.topics||[])
    .flatMap(t => t.assignments||[])
    .filter(a => !submissions.find(s => s.assignment_id === a.id)).length;

  if (quizAvg > 0 && quizAvg < 60) improvements.push(`Quiz average is below 60% — needs improvement`);
  if (pendingAssigns > 0)           improvements.push(`${pendingAssigns} assignment(s) still pending`);
  if (weakTopics.length > 0)        improvements.push(`Weak performance in: ${weakTopics.slice(0,3).join(", ")}`);

  if (pendingAssigns > 0)   actions.push("Complete pending assignments.");
  if (weakTopics.length > 0) actions.push(`Review materials for: ${weakTopics[0]}.`);
  if (actions.length === 0)  actions.push("Keep up the excellent work! Stay consistent.");

  const sList = document.getElementById("strengthsList");
  const iList = document.getElementById("improveList");
  const aList = document.getElementById("actionsList");

  if (sList) sList.innerHTML = strengths.map(s    => `<li>${s}</li>`).join("") || "<li>Continue learning!</li>";
  if (iList) iList.innerHTML = improvements.map(s => `<li>${s}</li>`).join("") || "<li>Doing great!</li>";
  if (aList) aList.innerHTML = actions.map(a      => `<li>${a}</li>`).join("");

  const overall = avg([quizAvg, assignAvg].filter(x => x > 0));
  const banner  = document.getElementById("motivateBanner");
  if (banner) {
    banner.innerHTML = overall >= 80
      ? "<strong>🏆 Outstanding Performance!</strong> <span>Keep it up!</span>"
      : "<strong>Keep working hard!</strong> <span>You're making progress.</span>";
  }
}

/* ============================================================
   HELPERS
============================================================*/
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function fmt(val) {
  return val > 0 ? Math.round(val) + "%" : "N/A";
}

/* ============================================================
   SYNC TO DB — only called with overall stats
============================================================*/
async function syncPerformanceToDB(metrics) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  if (!token || !user) return;

  try {
    const res = await fetch(`${API}/student/update-performance`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metrics)
    });

    if (res.ok) {
      const data = await res.json();

      // ── Update level badge with DB ML result (overrides local estimate) ──
      if (data.level) {
        applyLevelBadge(
          document.getElementById("aiLearnerLevel"),
          document.getElementById("levelDesc"),
          data.level
        );
      }

      // ── Update risk badge — only shown in "all courses" view ──
      const riskEl = document.getElementById("dropoutRiskBadge");
      if (riskEl && data.risk) {
        applyRiskBadge(riskEl, data.risk);
      }
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
}

// Re-render charts on theme change
window.addEventListener('themeChanged', function() {
  const courses     = window._perfCourses;
  const attempts    = window._perfAttempts;
  const submissions = window._perfSubmissions;
  if (courses) {
    renderCourseChart(courses, attempts, submissions);
    renderSkillChart(courses, attempts, submissions);
  }
});