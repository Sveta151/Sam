# PaperPilot

A minimalistic, elegant research paper management MVP built with Next.js 14 (App Router) for hackathon demo.

## 🎯 Features

- **Tinder-style paper discovery** - Swipe through recommended papers with drag interactions
- **Smart folder organization** - Auto-suggest folders based on paper content
- **Reading streak tracking** - Track daily reading progress and maintain streaks
- **Project management** - Organize papers into projects and nested folders
- **Playlist recommendations** - Get top 3 paper recommendations per folder
- **Paper reader** - Track time spent and scroll progress on papers

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router & TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: Zustand with localStorage persistence
- **Design**: Light theme, Inter font, minimal & calm research vibe

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 🚀 Quick Start

The app is currently running on **http://localhost:3001**

### Mock Data

The app comes pre-seeded with:
- **1 Project**: "FDD Project" (Diffusion Models & Full-Duplex)
- **3 Folders**: 
  - Full Reciprocity
  - Partial Reciprocity
  - Diffusion Model
- **6 Research Papers** with realistic metadata

## 📁 Project Structure

```
paperpilot/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home page with Tinder deck
│   ├── projects/
│   │   ├── page.tsx            # Projects list
│   │   └── [id]/page.tsx       # Project detail with folder tree
│   ├── tinder/page.tsx         # Full-screen swipe deck
│   └── paper/[id]/page.tsx     # Paper reader with tracking
├── components/
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── paper-card.tsx          # Paper display (compact/tinder modes)
│   ├── swipe-deck.tsx          # Draggable card stack
│   ├── decision-modal.tsx      # Save paper modal with autosuggest
│   ├── streak-widget.tsx       # Reading streak display
│   ├── nudge-card.tsx          # Daily goal reminder
│   ├── folder-tree.tsx         # Collapsible folder navigation
│   ├── playlist-three.tsx      # Top 3 recommendations
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── store.ts                # Zustand state management
│   ├── mock.ts                 # Seed data
│   └── utils.ts                # Helper functions
└── styles/
    └── globals.css             # Global styles & CSS variables
```

## 🎨 Design Language

- **Colors**: Indigo accent (#4f46e5), neutral grays, white backgrounds
- **Typography**: Inter font family
- **Spacing**: Roomy (md: 6, lg: 8)
- **Borders**: rounded-2xl, soft shadows, muted borders
- **Motion**: Fade/slide 150-200ms, ease-out timing
- **Layout**: 12-column grid, max-width 1920px

## 🔄 User Flow

1. **Home** → View Tinder deck with recommended papers
2. **Swipe/Click Yes** → Opens decision modal with auto-suggested folder
3. **Save to Folder** → Paper added to project folder
4. **Saved Papers** (sidebar) → View all projects
5. **Project Detail** → Browse folder tree, view papers, see playlist recommendations
6. **Paper Reader** → Read paper with time & scroll tracking

## 🎯 Key Interactions

- **Drag to swipe** papers left (skip) or right (save)
- **Keyboard support**: Arrow keys for Yes/No on Tinder page
- **Auto-suggest**: Fuzzy matching between paper title and folder name/tags
- **Streak tracking**: Updates when reading papers and scrolling
- **LocalStorage**: All state persists across sessions

## 📊 State Management

Zustand store includes:
- `projects`, `folders`, `papers`, `recs`, `reads`
- `swipe()` - Handle paper save/skip
- `autosuggestFolder()` - Smart folder matching
- `markReadProgress()` - Track reading activity
- `getTinderFeed()` - Get unprocessed recommendations
- `getPlaylistForFolder()` - Get top 3 recommendations per folder
- `getStreak()` - Calculate consecutive reading days
- `getTodayMinutes()` - Sum today's reading time

## 🎭 Components Breakdown

### PaperCard
- **Modes**: `compact` (list view) | `tinder` (full card)
- Shows: title, authors, venue, year, citations, summary, labels

### SwipeDeck
- Draggable card stack with framer-motion
- Visual feedback: "SKIP" / "SAVE" overlays
- Buttons for non-drag interaction
- Opens DecisionModal on "Yes"

### DecisionModal
- Displays paper preview
- Dropdown to select folder (auto-suggested by default)
- Confirms and saves paper to folder
- Toast notification on success

### StreakWidget
- **Variants**: `compact` (sidebar) | `full` (home page)
- Shows: flame icon, streak count, today's minutes, progress ring
- Daily goal: 30 minutes

### FolderTree
- Collapsible nested structure
- Shows folder tags on selection
- Highlights selected folder

## 🔮 Future Enhancements (Not Implemented)

- Real PDF rendering (currently placeholder)
- Backend API integration
- Chat panel for paper Q&A
- Upload dropzone for new papers
- Synthesize feature for folder insights
- More advanced recommendation algorithms

## 📝 Notes

- All API calls are stubbed (no backend)
- Mock data auto-initializes on first load
- State persists in localStorage as `paperpilot-storage`
- Optimized for desktop, mobile-friendly
- Accessibility: aria-labels, keyboard navigation, reduced-motion support

## 🙏 Acknowledgments

Built for hackathon MVP demonstration. Clean, minimal, research-focused UI following modern web best practices.

---

**Status**: ✅ All features implemented and working
**Build**: ✅ Production build successful
**Dev Server**: Running on port 3001
