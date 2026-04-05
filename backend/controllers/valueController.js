import { User } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER DATA
// ─────────────────────────────────────────────────────────────────────────────

const VALUES_LIST = [
  { id: "v1",  name: "Acceptance & Mindfulness",     desc: "Being open to yourself, others, and the present moment." },
  { id: "v2",  name: "Adventure & Curiosity",         desc: "Seeking new experiences, exploring, and staying open-minded." },
  { id: "v3",  name: "Assertiveness & Courage",       desc: "Standing up for yourself respectfully and facing challenges bravely." },
  { id: "v4",  name: "Authenticity & Honesty",        desc: "Being true, genuine, and sincere in thoughts, words, and actions." },
  { id: "v5",  name: "Respect",                       desc: "Treating yourself and others with consideration and positive regard." },
  { id: "v6",  name: "Beauty & Creativity",           desc: "Appreciating, creating, and nurturing beauty in life and self-expression." },
  { id: "v7",  name: "Caring & Kindness",             desc: "Acting with compassion and consideration toward yourself and others." },
  { id: "v8",  name: "Connection & Intimacy",         desc: "Building meaningful relationships and being fully present with others." },
  { id: "v9",  name: "Contribution & Supportiveness", desc: "Helping, giving, and making a positive difference." },
  { id: "v10", name: "Fairness & Justice",            desc: "Treating self and others with equality, fairness, and integrity." },
  { id: "v11", name: "Fitness & Self-care",           desc: "Maintaining physical and mental health and wellbeing." },
  { id: "v12", name: "Flexibility & Adaptability",    desc: "Adjusting and responding well to change." },
  { id: "v13", name: "Freedom & Independence",        desc: "Living freely, making choices, and being self-directed." },
  { id: "v14", name: "Fun & Excitement",              desc: "Seeking enjoyment, thrill, and joy in life." },
  { id: "v15", name: "Gratitude & Humility",          desc: "Appreciating life, others, and staying humble." },
  { id: "v16", name: "Patience & Persistence",        desc: "Staying steady, waiting calmly, and continuing despite obstacles." },
  { id: "v17", name: "Power & Responsibility",        desc: "Taking charge, influencing, and being accountable for your actions." },
  { id: "v18", name: "Romance & Love",                desc: "Expressing love, affection, and emotional closeness." },
  { id: "v19", name: "Self-Development",              desc: "Growing, learning, and improving your skills, knowledge, and character." },
  { id: "v20", name: "Spirituality & Meaning",        desc: "Connecting to something larger than yourself, purpose, or deeper values." },
];

const DOMAIN_META = {
  family:   { name: "Family",   icon: "fa-house-user" },
  work:     { name: "Work",     icon: "fa-briefcase"  },
  hobbies:  { name: "Hobbies",  icon: "fa-palette"    },
  yourself: { name: "Yourself", icon: "fa-user"       },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/values-compass
// ─────────────────────────────────────────────────────────────────────────────
export const getValuesCompassData = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId).select("sessionHistory currentSession");
    if (!user) return res.status(404).json({ message: "User not found" });

    const session6 = (user.sessionHistory || [])
      .filter((s) => s.sessionNumber === 6 && s.status === "COMPLETED")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!session6) {
      return res.status(200).json({ unlocked: false, data: null });
    }

    const r = session6.reflections || {};

    const sortedValues = (r.s6SortedValues || [])
      .map((id) => VALUES_LIST.find((v) => v.id === id))
      .filter(Boolean);

    const ratings = r.s6Ratings || {};
    const veryImportant  = VALUES_LIST.filter((v) => ratings[v.id] === "V");
    const quiteImportant = VALUES_LIST.filter((v) => ratings[v.id] === "Q");
    const notImportant   = VALUES_LIST.filter((v) => ratings[v.id] === "N");

    const selectedDomains = (r.s6SelectedDomains || []).map((id) => ({
      id,
      ...(DOMAIN_META[id] || { name: id, icon: "fa-circle" }),
    }));

    return res.status(200).json({
      unlocked: true,
      data: {
        sortedValues,
        veryImportant,
        quiteImportant,
        notImportant,
        selectedDomains,
        actionLog: r.s6ActionLog || [],
        completedAt: session6.timestamp,
      },
    });
  } catch (err) {
    console.error("[getValuesCompassData]", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/values-action-log
// ─────────────────────────────────────────────────────────────────────────────
export const addActionLogEntry = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { value, action, size, rating, date } = req.body;

    if (!value?.trim() || !action?.trim()) {
      return res.status(400).json({ message: "Value and action are required." });
    }

    const newEntry = {
      date:    date || new Date().toLocaleDateString("en-GB"),
      value:   value.trim(),
      action:  action.trim(),
      size:    size   || "Small",
      rating:  rating || "",
      addedAt: new Date(),
    };

    const updated = await User.findOneAndUpdate(
      { _id: userId, "sessionHistory.sessionNumber": 6 },
      { $push: { "sessionHistory.$.reflections.s6ActionLog": newEntry } },
      { new: true }
    ).select("sessionHistory");

    if (!updated) {
      return res.status(404).json({
        message: "Session 6 history not found. Complete Module 6 first.",
      });
    }

    const session6 = updated.sessionHistory.find((s) => s.sessionNumber === 6);

    return res.status(200).json({
      success: true,
      actionLog: session6?.reflections?.s6ActionLog || [],
    });
  } catch (err) {
    console.error("[addActionLogEntry]", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/values-action-log/:index
// ─────────────────────────────────────────────────────────────────────────────
export const deleteActionLogEntry = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const idx = parseInt(req.params.index, 10);

    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ message: "Invalid index." });
    }

    const user = await User.findById(userId).select("sessionHistory");
    if (!user) return res.status(404).json({ message: "User not found." });

    const session6 = user.sessionHistory.find((s) => s.sessionNumber === 6);
    if (!session6) {
      return res.status(404).json({ message: "Session 6 not found." });
    }

    const log = session6.reflections?.s6ActionLog || [];
    if (idx >= log.length) {
      return res.status(400).json({ message: "Index out of range." });
    }

    log.splice(idx, 1);

    await User.findOneAndUpdate(
      { _id: userId, "sessionHistory.sessionNumber": 6 },
      { $set: { "sessionHistory.$.reflections.s6ActionLog": log } }
    );

    return res.status(200).json({ success: true, actionLog: log });
  } catch (err) {
    console.error("[deleteActionLogEntry]", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/value/session7-values
// ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/value/session7-values
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/value/session7-values
// ─────────────────────────────────────────────────────────────────────────────
export const getSession7ValuesData = async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id;
  
      const user = await User.findById(userId).select("sessionHistory currentSession");
      if (!user) return res.status(404).json({ message: "User not found" });
  
      // 1. Fetch Session 7
      const session7 = (user.sessionHistory || [])
        .filter((s) => s.sessionNumber === 7 && s.status === "COMPLETED")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  
      if (!session7) {
        return res.status(200).json({ unlocked: false, data: null });
      }
  
      // 2. Fetch Session 6 (To get the domains)
      const session6 = (user.sessionHistory || [])
        .filter((s) => s.sessionNumber === 6 && s.status === "COMPLETED")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  
      const r7 = session7.reflections || {};
      const r6 = session6?.reflections || {};
  
      // 3. Extract and map the Domain IDs from Session 6
      // We check `s6SelectedDomains` and fallback to `choose-domains` just in case
      const domainIds = r6.s6SelectedDomains || r6['choose-domains'] || [];
      const selectedDomains = domainIds.map((id) => ({
        id,
        ...(DOMAIN_META[id] || { name: id, icon: "fa-circle" }),
      }));
  
      return res.status(200).json({
        unlocked: true,
        data: {
          s7SelectedValue: r7.s7SelectedValue || "Not selected",
          s7SmartGoal: r7.s7SmartGoal || null,
          s7Barriers: r7.s7Barriers || [],
          selectedDomains: selectedDomains, // <-- Send the domains here!
          completedAt: session7.timestamp,
        },
      });
    } catch (err) {
      console.error("[getSession7ValuesData]", err);
      return res.status(500).json({ message: "Server error", error: err });
    }
  };