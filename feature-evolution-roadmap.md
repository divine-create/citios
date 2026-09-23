# CityOS Feature Evolution Roadmap

## NOW (P0/P1 - Immediate Polish)
### 1. Visual Coherence across Admin Workspaces
- **Problem**: SchoolOS, HotelOS, and ShopDashboard look like completely different applications.
- **Value**: Establishes CityOS as a single, trusted operating system for businesses.
- **Complexity**: Low/Medium (CSS/Component refactoring).

### 2. Interaction Design & Unicode Fixes
- **Problem**: Mojibake (corrupted characters) and lack of loading skeletons.
- **Value**: Premium feel.
- **Complexity**: Low.

### 3. Unified Error Handling
- **Problem**: Reliance on standard browser APIs or unhandled promise crashes.
- **Value**: User trust during transactions.
- **Complexity**: Low.

## NEXT (P2/P3 - Experience Upgrades)
### 1. Global Saved Items (Favorites)
- **Problem**: Residents cannot bookmark products or services for later.
- **Value**: High engagement and retention.
- **Complexity**: Medium (Requires canonical data model for SavedItem).

### 2. Activity / History Center
- **Problem**: Activity is fragmented by vertical (Orders vs Bookings).
- **Value**: "What have I done on CityOS" answered in one place.
- **Complexity**: Medium (Aggregating existing tables).

## LATER (P4/P5 - Complex New Features)
### 1. Unified Global Search
- **Problem**: Search is siloed by vertical.
- **Value**: Instant discovery.
- **Complexity**: High (Requires ElasticSearch or robust PostgreSQL full-text search indexing across entities).

### 2. Deep Personalization ("Around You")
- **Problem**: Discovery is somewhat static.
- **Value**: Highly relevant local content.
- **Complexity**: High (Geospatial querying, recommendation engine).

## DO NOT BUILD YET
- Native Mobile App (Focus on PWA/WebView quality first).
- Advanced AI Agents (Until core transactions are fully stable).
- OTA (Online Travel Agency) external sync for HotelOS (Too complex for MVP).
