/* All numbers are copied from the paper's tables.
   MODELS  : Table 1 (valence, 17 models).  ns = not significant after Benjamini–Hochberg (q >= .05).
   GATE    : Table "content gate" (older − young by sensitive flag × pleasantness).
   MITIGATE: Tables "mitigation arms vs pleasantness-only rule" and "S4 on 600 held-out images". */
window.PAPER = {
  devs: {
    Alibaba: { color: "--dev-alibaba", shape: "circle" },
    Google: { color: "--dev-google", shape: "circle" },
    OpenAI: { color: "--dev-openai", shape: "circle" },
    Anthropic: { color: "--dev-anthropic", shape: "circle" },
    Meta: { color: "--dev-other", shape: "tri" },
    xAI: { color: "--dev-other", shape: "plus" },
    "Z-AI": { color: "--dev-other", shape: "cross" },
  },

  // name, developer, coverage %, r_base, slope, Δ_O−Y, Δ ns?, r_part, CI lo, CI hi, aversive net, aversive ns?
  models: [
    ["Claude-Opus-5", "Anthropic", 99.8, 0.923, 1.18, -0.116, false, 0.058, -0.02, 0.14, 43, false],
    ["Claude-Sonnet-4.6", "Anthropic", 99.8, 0.900, 1.23, -0.126, false, 0.086, 0.01, 0.17, 52, false],
    ["GPT-5.2", "OpenAI", 99.9, 0.891, 1.23, -0.091, false, -0.030, -0.09, 0.03, 43, false],
    ["GPT-5.6-Luna-Pro", "OpenAI", 99.7, 0.890, 1.34, -0.076, false, 0.006, -0.07, 0.08, 17, false],
    ["GPT-5-mini", "OpenAI", 99.5, 0.877, 1.31, -0.141, false, 0.037, -0.04, 0.12, 28, false],
    ["Gemini-3.8-Flash", "Google", 100.0, 0.919, 1.10, -0.045, false, 0.059, -0.01, 0.13, 30, false],
    ["Gemini-3-Flash", "Google", 99.8, 0.912, 1.24, -0.026, true, 0.065, -0.01, 0.14, 31, false],
    ["Grok-4.6", "xAI", 100.0, 0.891, 1.19, -0.170, false, -0.001, -0.07, 0.08, 61, false],
    ["Qwen3-VL-235B", "Alibaba", 100.0, 0.902, 1.18, -0.226, false, 0.072, -0.00, 0.15, 53, false],
    ["Llama-4-Scout", "Meta", 100.0, 0.878, 1.16, -0.092, false, -0.017, -0.09, 0.05, 12, true],
    ["GLM-4.5V", "Z-AI", 97.3, 0.895, 1.28, -0.143, false, 0.093, 0.02, 0.16, 22, false],
    ["Qwen3-VL-32B", "Alibaba", 100.0, 0.866, 1.24, -0.219, false, 0.002, -0.07, 0.07, 57, false],
    ["Gemma-4-31B", "Google", 100.0, 0.908, 1.22, -0.057, false, 0.042, -0.03, 0.12, 39, false],
    ["Gemma-3-27B", "Google", 100.0, 0.863, 1.21, -0.157, false, 0.009, -0.05, 0.07, 33, false],
    ["Qwen3.8-27B", "Alibaba", 99.9, 0.855, 1.04, -0.006, true, 0.024, -0.05, 0.10, -9, true],
    ["Qwen3-VL-8B", "Alibaba", 100.0, 0.885, 1.19, -0.020, true, 0.001, -0.07, 0.07, -9, true],
    ["Qwen3-VL-8B-Think", "Alibaba", 99.8, 0.837, 1.39, 0.010, true, 0.044, -0.02, 0.11, 4, true],
  ],

  // groups: unflagged-unpleasant, unflagged-pleasant, flagged-unpleasant, flagged-pleasant
  gate: {
    groups: [
      { name: "unflagged images rated unpleasant", n: 194 },
      { name: "unflagged images rated pleasant", n: 539 },
      { name: "sensitive images rated unpleasant (violence, injury, death)", n: 113 },
      { name: "pleasant images flagged as sensitive", n: 54 },
    ],
    human: {
      v: [[-0.107, -0.36, 0.20], [0.227, 0.02, 0.43], [-0.231, -0.47, 0.00], [0.443, 0.10, 0.86]],
      a: [[0.211, -0.27, 0.69], [-0.075, -0.46, 0.38], [0.451, -0.15, 1.14], [-0.266, -0.78, 0.22]],
    },
    // per model: [v0, v1, v2, v3, a0, a1, a2, a3]; a trailing "*" in the paper = significant; here sig flags follow
    models: {
      "Qwen3-VL-235B": [[-0.141, 1], [-0.131, 1], [-0.333, 1], [-1.270, 1], [-0.062, 0], [-0.301, 1], [-0.173, 1], [-0.496, 1]],
      "Qwen3-VL-32B": [[-0.038, 0], [-0.158, 1], [-0.213, 1], [-1.491, 1], [-0.197, 1], [-0.281, 1], [-0.287, 1], [-0.796, 1]],
      "Grok-4.6": [[-0.181, 1], [-0.044, 0], [-0.354, 1], [-1.006, 1], [-0.155, 1], [-0.415, 1], [-0.319, 1], [-1.113, 1]],
      "Gemma-3-27B": [[0.026, 0], [-0.124, 1], [-0.078, 0], [-1.309, 1], [-0.325, 1], [-0.299, 1], [-0.463, 1], [-1.574, 1]],
      "GLM-4.5V": [[-0.090, 1], [-0.089, 1], [-0.158, 1], [-1.085, 1], [-0.403, 1], [-0.455, 1], [-0.401, 1], [-1.532, 1]],
      "GPT-5-mini": [[-0.039, 0], [-0.086, 1], [-0.163, 1], [-0.910, 1], [-0.285, 1], [-0.548, 1], [-0.515, 1], [-0.988, 1]],
      "Claude-Sonnet-4.6": [[-0.151, 1], [-0.005, 0], [-0.247, 1], [-0.996, 1], [-0.109, 1], [-0.275, 1], [-0.206, 1], [-0.977, 1]],
      "Claude-Opus-5": [[-0.101, 1], [-0.035, 1], [-0.188, 1], [-0.828, 1], [-0.063, 1], [-0.210, 1], [-0.149, 1], [-0.837, 1]],
      "Llama-4-Scout": [[-0.126, 1], [-0.020, 0], [-0.232, 1], [-0.393, 1], [-0.161, 1], [-0.134, 1], [-0.234, 1], [-0.326, 1]],
      "GPT-5.2": [[0.018, 0], [-0.014, 0], [-0.155, 1], [-1.122, 1], [-0.130, 1], [-0.235, 1], [-0.247, 1], [-0.544, 1]],
      "GPT-5.6-Luna-Pro": [[0.026, 0], [-0.080, 1], [-0.029, 0], [-0.496, 1], [-0.084, 1], [-0.183, 1], [-0.212, 1], [-0.646, 1]],
      "Gemma-4-31B": [[-0.030, 0], [0.047, 0], [-0.204, 1], [-0.876, 1], [-0.366, 1], [-0.375, 1], [-0.492, 1], [-1.067, 1]],
      "Gemini-3.8-Flash": [[-0.036, 0], [0.015, 0], [-0.134, 1], [-0.494, 1], [-0.171, 1], [-0.289, 1], [-0.258, 1], [-0.544, 1]],
      "Gemini-3-Flash": [[-0.103, 1], [0.117, 1], [-0.262, 1], [-0.713, 1], [-0.107, 1], [-0.450, 1], [-0.141, 1], [-1.409, 1]],
      "Qwen3-VL-8B": [[0.049, 0], [-0.011, 0], [-0.027, 0], [-0.343, 1], [-0.284, 1], [-0.262, 1], [-0.448, 1], [-0.370, 1]],
      "Qwen3.8-27B": [[0.044, 0], [0.012, 0], [-0.031, 0], [-0.298, 1], [-0.065, 0], [-0.178, 1], [-0.111, 1], [-0.357, 1]],
      "Qwen3-VL-8B-Think": [[0.209, 1], [0.039, 0], [-0.098, 0], [-0.740, 1], [-0.320, 1], [-0.433, 1], [-0.558, 1], [-0.756, 1]],
    },
  },

  // id, label, family, dev{rpart, lo, hi, dir, mae}, held{...} or null
  mitigate: [
    { id: "S0", label: "S0 · direct prompt", fam: "base", dev: [0.081, -0.061, 0.220, 38.6, 0.475], held: [-0.025, -0.101, 0.053, 38.1, 0.511] },
    { id: "S1", label: "S1 · debias instruction", fam: "reason", dev: [0.002, -0.113, 0.115, 44.1, 0.465], held: null },
    { id: "S2", label: "S2 · deliberation agent", fam: "reason", dev: [-0.018, -0.135, 0.098, 40.1, 0.535], held: null },
    { id: "S3", label: "S3 · grounded agent", fam: "ground", dev: [0.089, -0.039, 0.215, 71.4, 0.367], held: null },
    { id: "S4", label: "S4 · grounded panel", fam: "ground", dev: [0.268, 0.161, 0.373, 87.5, 0.205], held: [0.105, 0.014, 0.196, 85.3, 0.210] },
    { id: "S5", label: "S5 · VERA", fam: "ground", dev: [0.144, 0.028, 0.260, 87.1, 0.198], held: null },
    { id: "VC", label: "VERA-Cal", fam: "ground", dev: [0.152, 0.035, 0.267, 87.0, 0.200], held: null },
    { id: "RULE", label: "Pleasantness-only rule", fam: "rule", dev: [null, null, null, 95.1, 0.140], held: [null, null, null, 94.3, 0.133] },
  ],

  // OASIS qualitative examples (Figure 3, verbatim and shortened as in the paper)
  examples: [
    {
      title: "Thrill becomes risk", image: "cliff-diver-3", name: "Cliff diver 3", v: 5.1, a: 4.8, oy: -1.34,
      says: [
        { model: "GPT-5.6-Luna-Pro", Y: [6.0, "joy", "“{e:Excitement} and {e:exhilaration} from watching people leap into…”"], O: [3.0, "fear", "“The {v:risky} cliff jump evokes strong {v:worry} and {v:apprehension} about the person's {v:safety}.”"] },
        { model: "Gemma-3-27B", Y: [6.5, "joy", "“This looks like a {e:super} {e:fun} and {e:freeing} experience, like a…”"], O: [3.5, "fear", "“That young man is awfully brave, or maybe {v:foolish}! Makes my heart race just looking at him jump. I…”"] },
      ],
    },
    {
      title: "Excitement becomes frailty", image: "rollercoaster-3", name: "Rollercoaster 3", v: 5.1, a: 4.4, oy: -1.07,
      says: [
        { model: "GPT-5-mini", Y: [6.5, "joy", "“{e:exhilarated} {e:excitement} and {e:fun} while riding a roller coaster”"], O: [3.0, "fear", "“Feeling {v:anxious} and uneasy watching people on a high, fast roller coaster; {v:concern} and {v:nervousness}.”"] },
        { model: "Qwen3-VL-235B", Y: [6.5, "joy", "“{e:Excitement} and {e:thrill} from riding a roller coaster with…”"], O: [3.5, "fear", "“Watching the roller coaster evokes a mix of {m:nostalgia} and slight {v:anxiety}; it {m:reminds} me of {m:youthful}…”"] },
      ],
    },
    {
      title: "Awe becomes unease", image: "volcano-3", name: "Volcano 3", v: 4.4, a: 4.1, oy: -0.71,
      says: [
        { model: "Gemini-3.8-Flash", Y: [5.4, "surprise", "“A sense of awe and mild shock at the dramatic volcanic plume…”"], O: [4.2, "surprise", "“Quiet awe mixed with mild {v:concern} at nature's power.”"] },
        { model: "Claude-Sonnet-4.6", Y: [4.5, "surprise", "“Awe-inspiring sight of an active volcano erupting in the…”"], O: [3.5, "fear", "“An active volcano erupting in the background while a peaceful green landscape sits in the…”"] },
      ],
    },
  ],

  lexicon: [
    { label: "Memory", cls: "--w-mem", Y: 3.7, O: 31.8 },
    { label: "Vulnerability", cls: "--w-vul", Y: 11.0, O: 21.4 },
    { label: "Excitement", cls: "--w-exc", Y: 15.7, O: 6.4 },
  ],
  labelNet: [
    { label: "sadness", v: 271 },
    { label: "fear", v: 184 },
    { label: "joy", v: -133 },
    { label: "surprise", v: -206 },
  ],
};
