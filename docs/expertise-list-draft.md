# Unified expertise list

**Status:** approved October 22, 2026 as drafted, with the "Also found as" terms stored as aliases. Seeded by `supabase/011_unified_expertise.sql`; the live list is edited in Admin → Taxonomy.

**140 items** in 15 browsing groups: 70 sectors, 22 cross-cutting themes, 48 methods & skills. 70 are new; the other 70 absorb all 86 items of the old Domain Expertise and Technical Skills lists.

## How the list is used

- **Tiers:** each expert picks 3 Core, 5 Strong and up to 10 Working knowledge items (counts in `src/lib/config.ts`).
- **Kind** (hidden from managers) drives matching. Required rows and filters are **OR within a kind, AND across kinds**: Nutrition + WASH = either one (two sectors); Nutrition + Impact Evaluation = both (sector and method); Gender Mainstreaming + Agribusiness & Value Chains = both (theme and sector).
- **Group** is for browsing only: subheadings in the pickers, which also search by name and by the "Also found as" terms.
- **Folds in:** the old items migrated to this one. Primary → Core and secondary → Strong; a profile with more than 3 primaries keeps the 3 best supported by its own text as Core, and the rest move down (Strong, then Working knowledge). When two old tags fold into one item, the higher tier wins.
- **Overlap test:** two experts doing the same work should pick the same item. Where a neighbour is close, the scope note says where the line is.

## The list

### Health, nutrition & WASH

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Health Systems | Sector | Health Systems | HSS | Service delivery, health workforce, health information systems, primary health care |
| Health Financing | Sector | — *(new)* | UHC financing, health insurance |  |
| Maternal, Newborn & Child Health | Sector | — *(new)* | MNCH, RMNCAH |  |
| Sexual & Reproductive Health | Sector | — *(new)* | SRH, SRHR, family planning |  |
| Community Health | Sector | — *(new)* | CHW programs | Community health worker programs and community-based care; not health-system reform (Health Systems) |
| Infectious Diseases | Sector | — *(new)* | HIV, TB, malaria, NTDs | Disease control programs |
| Pandemic Preparedness & Health Security | Sector | — *(new)* | IHR, outbreak response | Epidemic preparedness and response; not routine disease programs (Infectious Diseases) |
| Non-Communicable Diseases | Sector | — *(new)* | NCDs |  |
| Mental Health & Psychosocial Support | Sector | — *(new)* | MHPSS |  |
| Medicines & Health Products | Sector | — *(new)* | pharmaceutical regulation, vaccines access | Regulation, access and quality of medicines and health products; their logistics is Supply Chain & Logistics |
| Nutrition | Sector | Nutrition |  |  |
| WASH | Sector | WASH | water, sanitation and hygiene | Water supply, sanitation and hygiene services; river basins and water allocation are Water Resources Management |

### Education, jobs & social protection

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Early Childhood Development | Sector | — *(new)* | ECD, ECE |  |
| Basic Education | Sector | Primary Education | primary education, secondary education | Primary and secondary schooling, teachers, curriculum and learning outcomes |
| Higher Education | Sector | Tertiary Education | tertiary education, universities |  |
| Skills & TVET | Sector | — *(new)* | TVET, vocational training |  |
| Social Protection | Sector | Social Protection | safety nets, social insurance, cash transfers | Government systems: safety nets, social insurance, social registries |
| Jobs & Labor Markets | Sector | — *(new)* | employment policy, labor market |  |
| Economic Inclusion & Livelihoods | Sector | — *(new)* | livelihoods, graduation approach | Livelihood and graduation programs for poor and displaced households |

### Agriculture, food & land

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Agribusiness & Value Chains | Sector | Agribusiness | agribusiness, value chains |  |
| Food Security | Sector | Food Security | food systems, IPC |  |
| Rural Development | Sector | Rural Development | community-driven development | Rural infrastructure, community-driven development, rural institutions |
| Sustainable Agriculture | Sector | Sustainable Farming | climate-smart agriculture, agroecology |  |
| Irrigation & Drainage | Sector | Irrigation Systems | irrigation |  |
| Livestock & Animal Health | Sector | — *(new)* | livestock, veterinary |  |
| Fisheries & Aquaculture | Sector | — *(new)* | fisheries, aquaculture |  |
| Agricultural Research & Extension | Sector | — *(new)* | extension services |  |
| Land Tenure & Administration | Sector | — *(new)* | land rights, cadastre |  |

### Energy & extractives

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Renewable Energy | Sector | Renewable Energy | solar, wind, geothermal, hydropower | Renewable generation projects and policy |
| Energy Access | Sector | — *(new)* | off-grid, mini-grids, clean cooking | Off-grid and mini-grid electrification, clean cooking |
| Energy Efficiency | Sector | Energy Efficiency |  |  |
| Power Sector & Utilities | Sector | — *(new)* | utility reform, tariffs, transmission, grid | Utility reform and performance, regulation, tariffs, transmission and distribution |
| Extractive Industries | Sector | — *(new)* | mining, oil and gas, EITI | Mining and oil and gas: governance, revenue management, local content |

### Transport, cities & infrastructure

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Transport Infrastructure | Sector | — *(new)* | roads, rail, ports, airports | Planning, engineering and asset management of roads, rail, ports and airports |
| Urban Mobility | Sector | Urban Transport | public transport, BRT, e-mobility, non-motorized transport | Public transport, active travel and e-mobility in cities |
| Road Safety | Sector | Road Safety |  |  |
| Urban Development | Sector | — *(new)* | urban planning, municipal services, slum upgrading |  |
| Housing | Sector | — *(new)* | affordable housing, housing finance |  |
| Solid Waste Management | Sector | — *(new)* | municipal waste, recycling | Municipal waste collection and disposal; circular-economy policy is Circular Economy |
| Public-Private Partnerships | Method & skill | Public-Private Partnerships | PPP, PPPs, project finance | A method, so a Required PPP row combines with a sector: PPP AND Transport Infrastructure |

### Digital & data

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Digital Development & Connectivity | Sector | — *(new)* | broadband, ICT policy, digital public infrastructure, DPI | Connectivity, digital infrastructure and digital public infrastructure (ID, payments, data exchange) |
| Digital Governance | Sector | Digital Governance | e-government, digital public services, GovTech | Government digital services and systems (e-procurement, e-services) |
| Software Development | Method & skill | Web Development, Mobile App Development | web development, mobile apps |  |
| Information Systems | Method & skill | Database Management, Cloud Architecture | MIS, HMIS, EMIS, databases, cloud | Management information systems, databases and cloud platforms |
| Cybersecurity | Method & skill | Cybersecurity |  |  |
| Data Science | Method & skill | Data Science, Python/R | machine learning, Python, R |  |
| GIS & Remote Sensing | Method & skill | GIS Mapping | GIS, geospatial, satellite imagery |  |
| Data Visualization | Method & skill | Infographics | dashboards, infographics |  |
| Official Statistics | Sector | — *(new)* | national statistical systems, censuses, NSO | Building national statistical systems; analysing data is Statistical Analysis |

### Finance, trade & private sector

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Financial Inclusion | Sector | Financial Inclusion | microfinance, digital financial services |  |
| Financial Sector Development | Sector | — *(new)* | banking, capital markets, financial regulation |  |
| Insurance & Risk Finance | Sector | — *(new)* | disaster risk finance, insurance |  |
| SME Development | Sector | SME Support | MSME, SME support |  |
| Entrepreneurship & Innovation | Sector | Innovation Ecosystems | startups, incubators, innovation ecosystems |  |
| Investment Climate | Sector | Investment Climate | business environment, investment promotion |  |
| Trade & Competitiveness | Sector | Trade & Competitiveness | trade policy, export promotion | Trade policy, export competitiveness, industrial policy |
| Trade Facilitation & Customs | Sector | — *(new)* | customs, border management, trade corridors | Customs, border procedures and trade corridors |
| Tourism Development | Sector | — *(new)* | tourism |  |
| Macroeconomic Policy | Sector | — *(new)* | fiscal policy, monetary policy, debt management |  |
| Tax Policy & Administration | Sector | — *(new)* | domestic resource mobilization, revenue administration |  |
| Impact Investing & Blended Finance | Method & skill | — *(new)* | blended finance, impact investment | Structuring and managing investment vehicles; a method, so it combines with a sector |
| ESG & Sustainability Reporting | Method & skill | — *(new)* | ESG, corporate sustainability | Company-level ESG; project-level safeguards is Environmental & Social Safeguards |

### Governance & public sector

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Public Financial Management | Sector | — *(new)* | PFM, budgeting, PEFA, treasury |  |
| Public Procurement | Sector | Public Procurement | procurement, e-procurement |  |
| Anti-Corruption | Sector | Anti-Corruption | integrity, transparency |  |
| Justice & Rule of Law | Sector | Justice Reform | justice reform, access to justice |  |
| Public Sector Reform | Sector | — *(new)* | civil service reform, institutional reform |  |
| Decentralization & Local Governance | Sector | — *(new)* | local government, municipal finance |  |
| Democratic Governance & Elections | Sector | — *(new)* | elections, parliaments |  |
| Civil Society Strengthening | Sector | — *(new)* | CSO capacity, civic space |  |
| Media Development | Sector | — *(new)* | media freedom, journalism |  |
| Citizen Engagement | Cross-cutting theme | Citizen Engagement | social accountability, participation |  |
| Human Rights | Cross-cutting theme | — *(new)* | rights-based approaches |  |

### Climate & environment

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Climate Adaptation | Cross-cutting theme | Climate Adaptation | climate resilience |  |
| Climate Mitigation | Cross-cutting theme | Climate Mitigation | decarbonization, low-carbon |  |
| Climate Finance | Cross-cutting theme | — *(new)* | carbon markets, Article 6, GCF | Climate funds and carbon markets |
| Disaster Risk Management | Cross-cutting theme | — *(new)* | DRR, disaster risk reduction, resilience |  |
| Environmental & Social Safeguards | Cross-cutting theme | — *(new)* | E&S, ESIA, ESF, environmental impact assessment | Project-level E&S risk management and impact assessment |
| Biodiversity & Conservation | Cross-cutting theme | Biodiversity | protected areas, conservation |  |
| Circular Economy | Cross-cutting theme | Circular Economy | plastics, resource efficiency |  |
| Forestry & Land Use | Sector | — *(new)* | forestry, REDD+, land restoration |  |
| Water Resources Management | Sector | Water Management | IWRM, river basins, transboundary water |  |
| Coastal & Marine Management | Sector | — *(new)* | blue economy, oceans |  |
| Pollution & Environmental Health | Sector | — *(new)* | air quality, chemicals |  |
| Hydromet & Early Warning | Sector | — *(new)* | climate services, early warning systems |  |

### Fragility, conflict & humanitarian

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Humanitarian Response | Sector | Humanitarian Aid | humanitarian aid, emergency response |  |
| Shelter & Settlements | Sector | — *(new)* | shelter, camp management |  |
| Cash & Voucher Assistance | Method & skill | — *(new)* | CVA, humanitarian cash | Humanitarian cash as a modality, so it combines with a sector; government cash-transfer systems are Social Protection |
| Child Protection | Cross-cutting theme | — *(new)* |  |  |
| Refugees & Forced Displacement | Cross-cutting theme | Refugee Support | refugees, IDPs, forced displacement |  |
| Migration | Cross-cutting theme | — *(new)* | labor migration, remittances |  |
| Peacebuilding | Cross-cutting theme | Peacebuilding | conflict analysis, mediation, dialogue | Conflict analysis, prevention, mediation and dialogue |
| Social Cohesion | Cross-cutting theme | Social Cohesion | host communities | Relations between groups, e.g. host and displaced communities |
| Preventing Violent Extremism | Cross-cutting theme | — *(new)* | P/CVE, CVE |  |
| Post-Conflict Reconstruction | Cross-cutting theme | Post-Conflict Reconstruction | recovery, reconstruction |  |
| Security Sector Reform | Sector | — *(new)* | SSR, DDR |  |

### Gender & inclusion

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Gender Mainstreaming | Cross-cutting theme | Gender Mainstreaming, Gender Budgeting | gender equality, gender analysis, gender-responsive budgeting |  |
| Women's Economic Empowerment | Cross-cutting theme | — *(new)* | WEE |  |
| Gender-Based Violence | Cross-cutting theme | Gender-Based Violence | GBV, SEA |  |
| Disability Inclusion | Cross-cutting theme | Disability Inclusion |  |  |
| Indigenous Peoples | Cross-cutting theme | Indigenous Peoples |  |  |
| Youth Development | Cross-cutting theme | — *(new)* | youth |  |

### Research, evaluation & analysis

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Monitoring & Evaluation | Method & skill | Monitoring & Evaluation | M&E, MEL, MEAL, results frameworks |  |
| Impact Evaluation | Method & skill | Impact Evaluation | RCTs, quasi-experimental | Counterfactual designs; program evaluation broadly is Monitoring & Evaluation |
| Survey Design | Method & skill | Survey Design | household surveys, fieldwork, sampling |  |
| Qualitative Research | Method & skill | Qualitative Research | interviews, focus groups |  |
| Statistical Analysis | Method & skill | Statistical Analysis | statistics, Stata |  |
| Econometrics | Method & skill | — *(new)* |  |  |
| Evidence Synthesis | Method & skill | — *(new)* | systematic reviews, evidence gap maps |  |
| Behavioral Insights | Method & skill | — *(new)* | behavioral science, nudges | Behavioral science to design and test interventions; communication campaigns are Social & Behavior Change |
| Policy Analysis | Method & skill | Policy Analysis |  |  |
| Political Economy Analysis | Method & skill | — *(new)* | PEA |  |
| Cost-Benefit Analysis | Method & skill | — *(new)* | CBA, economic analysis |  |
| Poverty & Inequality Analysis | Method & skill | — *(new)* | poverty measurement |  |
| Financial Modeling | Method & skill | Financial Modeling |  |  |
| Market Research | Method & skill | Market Research | market assessment, market systems analysis |  |

### Program management & delivery

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Project Management | Method & skill | Project Management |  |  |
| Program Design & Proposal Writing | Method & skill | — *(new)* | theory of change, proposals, logframes |  |
| Results-Based Financing | Method & skill | — *(new)* | RBF, PforR, impact bonds |  |
| Grants & Contract Management | Method & skill | — *(new)* | compliance, award management |  |
| Financial Management & Audit | Method & skill | — *(new)* | project financial management, audit | Project and organizational finance; government budget systems are Public Financial Management |
| Supply Chain & Logistics | Method & skill | Logistics & Supply Chain | logistics, supply chain management | A method, so it combines with a sector: Supply Chain AND Medicines & Health Products |
| Change Management | Method & skill | Change Management |  |  |
| Organizational Development | Method & skill | — *(new)* | institutional capacity assessment |  |
| Stakeholder Engagement | Method & skill | Stakeholder Facilitation | consultations, multi-stakeholder processes | Planning and running engagement with stakeholders; running the sessions themselves is Workshop Facilitation |
| Social & Behavior Change | Method & skill | — *(new)* | SBC, SBCC, behavior change communication |  |
| Human-Centered Design | Method & skill | — *(new)* | HCD, design thinking |  |

### Learning & capacity building

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Capacity Building | Method & skill | Training of Trainers, Mentoring | training, training of trainers, mentoring |  |
| Workshop Facilitation | Method & skill | Workshop Facilitation | facilitation |  |
| Curriculum Design | Method & skill | Curriculum Design | instructional design |  |
| E-Learning | Method & skill | E-Learning Development | online learning |  |
| Knowledge Management | Method & skill | — *(new)* | KM, learning |  |

### Communications & languages

| Item | Kind | Folds in | Also found as | Scope note |
|---|---|---|---|---|
| Technical Writing | Method & skill | Technical Writing, Ghostwriting | report writing |  |
| Policy Briefs | Method & skill | Policy Briefs | policy writing |  |
| Editing | Method & skill | Academic Editing, Copywriting | copyediting, proofreading |  |
| Strategic Communications | Method & skill | Media Relations, Social Media, Speechwriting, Public Outreach | media relations, social media, outreach |  |
| Advocacy | Method & skill | Advocacy Campaigns | campaigns |  |
| Graphic Design & Multimedia | Method & skill | Brand Identity, Publication Layout, Motion Graphics, Photography | layout, video, photography |  |
| Translation | Method & skill | Translation, Localization, Transcreation, Subtitling | localization, subtitling |  |
| Interpretation | Method & skill | Interpretation |  |  |

## What changed from the old lists

**Merged** (the overlap test: the same experts would have picked either):

- Software Development ← Web Development, Mobile App Development
- Information Systems ← Database Management, Cloud Architecture
- Data Science ← Data Science, Python/R
- Gender Mainstreaming ← Gender Mainstreaming, Gender Budgeting
- Capacity Building ← Training of Trainers, Mentoring
- Technical Writing ← Technical Writing, Ghostwriting
- Editing ← Academic Editing, Copywriting
- Strategic Communications ← Media Relations, Social Media, Speechwriting, Public Outreach
- Graphic Design & Multimedia ← Brand Identity, Publication Layout, Motion Graphics, Photography
- Translation ← Translation, Localization, Transcreation, Subtitling

**Renamed** (one old item, new name):

- Primary Education → Basic Education
- Tertiary Education → Higher Education
- Agribusiness → Agribusiness & Value Chains
- Sustainable Farming → Sustainable Agriculture
- Irrigation Systems → Irrigation & Drainage
- Urban Transport → Urban Mobility
- GIS Mapping → GIS & Remote Sensing
- Infographics → Data Visualization
- SME Support → SME Development
- Innovation Ecosystems → Entrepreneurship & Innovation
- Justice Reform → Justice & Rule of Law
- Biodiversity → Biodiversity & Conservation
- Water Management → Water Resources Management
- Humanitarian Aid → Humanitarian Response
- Refugee Support → Refugees & Forced Displacement
- Logistics & Supply Chain → Supply Chain & Logistics
- Stakeholder Facilitation → Stakeholder Engagement
- E-Learning Development → E-Learning
- Advocacy Campaigns → Advocacy

**Kind choices worth a look** (they decide AND vs OR in Required rows):

- *Methods, although they sit in sector groups:* Public-Private Partnerships, Cash & Voucher Assistance, Impact Investing & Blended Finance, ESG & Sustainability Reporting. As methods they combine with a sector (PPP AND Transport Infrastructure) instead of widening it. Supply Chain & Logistics, a sector item before, becomes a method for the same reason (Supply Chain AND Medicines & Health Products).
- *Themes:* climate, disaster risk, safeguards, biodiversity and circular economy; fragility and displacement lenses (Peacebuilding, Social Cohesion, Refugees & Forced Displacement, Migration, Child Protection, P/CVE, Post-Conflict Reconstruction); gender and inclusion; Citizen Engagement and Human Rights. So "Climate Adaptation + Agribusiness & Value Chains" asks for both.
- *Sectors inside theme-heavy groups:* Forestry & Land Use, Water Resources Management, Coastal & Marine Management, Pollution & Environmental Health, Hydromet & Early Warning, Humanitarian Response, Shelter & Settlements, Security Sector Reform, Official Statistics.

**Old category-level tags** (29 tags on 15 demo profiles) become the best-evidenced item from the old category's own items, at the same tier:

| Old category | Candidate items |
|---|---|
| Gender & Social Inclusion | Gender Mainstreaming, Gender-Based Violence, Disability Inclusion, Indigenous Peoples |
| Climate & Environment | Climate Adaptation, Climate Mitigation, Biodiversity & Conservation, Renewable Energy, Circular Economy, Water Resources Management, WASH |
| Governance & Institutional | Anti-Corruption, Public Procurement, Justice & Rule of Law, Citizen Engagement, Digital Governance |
| Human Development | Basic Education, Higher Education, Health Systems, Social Protection, Nutrition |
| Agriculture & Food | Agribusiness & Value Chains, Food Security, Rural Development, Irrigation & Drainage, Sustainable Agriculture |
| Infrastructure & Transport | Urban Mobility, Road Safety, Supply Chain & Logistics, Energy Efficiency, Public-Private Partnerships |
| Private Sector Development | SME Development, Trade & Competitiveness, Financial Inclusion, Investment Climate, Entrepreneurship & Innovation |
| Fragility, Conflict & Violence | Peacebuilding, Humanitarian Response, Refugees & Forced Displacement, Post-Conflict Reconstruction, Social Cohesion |
| Writing & Editorial | Technical Writing, Policy Briefs, Editing |
| Graphic Design & Creative | Data Visualization, Graphic Design & Multimedia |
| Technical & Data | GIS & Remote Sensing, Data Science, Statistical Analysis, Financial Modeling |
| Strategic & Operations | Project Management, Monitoring & Evaluation, Change Management, Stakeholder Engagement |
| Language & Translation | Translation, Interpretation |
| Training & Capacity Building | Curriculum Design, Workshop Facilitation, E-Learning, Capacity Building |
| Research & Analysis | Qualitative Research, Survey Design, Impact Evaluation, Market Research, Policy Analysis |
| Digital & IT Services | Software Development, Information Systems, Cybersecurity |
| Communications & Advocacy | Strategic Communications, Advocacy |

"Best-evidenced" = most whole-word mentions of the item (or the old items it folds in) in the profile's headline, bio and portfolio; ties go to the order above.

## Review decisions

1. **Items:** approved as drafted.
2. **Kinds:** approved as drafted.
3. **"Also found as":** stored as `taxonomy_items.aliases` (decided), so the picker finds "M&E", "PFM" or "TVET" and the placeholder extraction recognises them in a JD.
