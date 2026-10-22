-- 011: unified expertise list with tiers (docs/MavenScout-profiles-membership.md §6).
--
-- Run once in the Supabase SQL editor after 010. Needs Postgres 15+
-- (regexp_count); the guard below stops before any change on older servers.
-- Safe to re-run: columns and constraints use IF NOT EXISTS / DROP-and-ADD,
-- rows insert only when missing, and the tier migration only fills profiles
-- whose tiered_expertise is still empty.
--
-- ADDITIVE ONLY. The old Domain Expertise and Technical Skills taxonomies and
-- profiles.expertise / profiles.skills stay exactly as they are, so code on
-- main keeps working (it filters taxonomy rows by type, so it never sees the
-- new 'expertise' rows). This branch reads and writes profiles.tiered_expertise.
-- 012_cleanup_legacy_data.sql removes the old structures after the merge.
-- The list itself is docs/expertise-list-draft.md (approved).

DO $guard$
BEGIN
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION '011 needs Postgres 15 or later (regexp_count); this server is %', version();
  END IF;
END
$guard$;

-- ---------------------------------------------------------------------------
-- Schema: widen the type CHECKs; give items a kind, search aliases and the
-- old item names they absorb; add the tiered tags column.
-- ---------------------------------------------------------------------------
ALTER TABLE taxonomy_categories DROP CONSTRAINT IF EXISTS taxonomy_categories_type_check;
ALTER TABLE taxonomy_categories ADD CONSTRAINT taxonomy_categories_type_check
  CHECK (type IN ('domain_expertise','technical_skills','work_arrangement','expertise'));
ALTER TABLE taxonomy_requests DROP CONSTRAINT IF EXISTS taxonomy_requests_type_check;
ALTER TABLE taxonomy_requests ADD CONSTRAINT taxonomy_requests_type_check
  CHECK (type IN ('domain_expertise','technical_skills','expertise'));

ALTER TABLE taxonomy_items
  -- What the item is, for matching (§6): Required rows and filters are OR within
  -- a kind, AND across kinds. NULL for work arrangements and the old lists.
  ADD COLUMN IF NOT EXISTS kind text CHECK (kind IN ('sector','theme','method')),
  -- Other names people search for or write in a JD: 'M&E', 'PFM', 'TVET'.
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}',
  -- Old Domain Expertise / Technical Skills item names folded into this item;
  -- used to read old tags and saved requirement rows.
  ADD COLUMN IF NOT EXISTS legacy_names text[] NOT NULL DEFAULT '{}';

-- [{name, tier: 'core' | 'strong' | 'working'}]; 3 Core, 5 Strong, up to 10
-- Working knowledge (counts app-enforced from src/lib/config.ts).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiered_expertise jsonb NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- The list: 15 browsing groups (type 'expertise') and 140 items.
-- ---------------------------------------------------------------------------
INSERT INTO taxonomy_categories (type, name, sort_order)
SELECT 'expertise', g.name, g.sort_order
FROM (VALUES
  ($$Health, nutrition & WASH$$, 1),
  ($$Education, jobs & social protection$$, 2),
  ($$Agriculture, food & land$$, 3),
  ($$Energy & extractives$$, 4),
  ($$Transport, cities & infrastructure$$, 5),
  ($$Digital & data$$, 6),
  ($$Finance, trade & private sector$$, 7),
  ($$Governance & public sector$$, 8),
  ($$Climate & environment$$, 9),
  ($$Fragility, conflict & humanitarian$$, 10),
  ($$Gender & inclusion$$, 11),
  ($$Research, evaluation & analysis$$, 12),
  ($$Program management & delivery$$, 13),
  ($$Learning & capacity building$$, 14),
  ($$Communications & languages$$, 15)
) AS g(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_categories c WHERE c.type = 'expertise' AND c.name = g.name);

INSERT INTO taxonomy_items (category_id, name, sort_order, kind, aliases, legacy_names)
SELECT c.id, i.name, i.sort_order, i.kind, i.aliases, i.legacy_names
FROM (VALUES
  ($$Health, nutrition & WASH$$, $$Health Systems$$, 1, $$sector$$, ARRAY[$$HSS$$], ARRAY[$$Health Systems$$]),
  ($$Health, nutrition & WASH$$, $$Health Financing$$, 2, $$sector$$, ARRAY[$$UHC financing$$, $$health insurance$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Maternal, Newborn & Child Health$$, 3, $$sector$$, ARRAY[$$MNCH$$, $$RMNCAH$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Sexual & Reproductive Health$$, 4, $$sector$$, ARRAY[$$SRH$$, $$SRHR$$, $$family planning$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Community Health$$, 5, $$sector$$, ARRAY[$$CHW programs$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Infectious Diseases$$, 6, $$sector$$, ARRAY[$$HIV$$, $$TB$$, $$malaria$$, $$NTDs$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Pandemic Preparedness & Health Security$$, 7, $$sector$$, ARRAY[$$IHR$$, $$outbreak response$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Non-Communicable Diseases$$, 8, $$sector$$, ARRAY[$$NCDs$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Mental Health & Psychosocial Support$$, 9, $$sector$$, ARRAY[$$MHPSS$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Medicines & Health Products$$, 10, $$sector$$, ARRAY[$$pharmaceutical regulation$$, $$vaccines access$$], '{}'::text[]),
  ($$Health, nutrition & WASH$$, $$Nutrition$$, 11, $$sector$$, '{}'::text[], ARRAY[$$Nutrition$$]),
  ($$Health, nutrition & WASH$$, $$WASH$$, 12, $$sector$$, ARRAY[$$water$$, $$sanitation and hygiene$$], ARRAY[$$WASH$$]),
  ($$Education, jobs & social protection$$, $$Early Childhood Development$$, 1, $$sector$$, ARRAY[$$ECD$$, $$ECE$$], '{}'::text[]),
  ($$Education, jobs & social protection$$, $$Basic Education$$, 2, $$sector$$, ARRAY[$$primary education$$, $$secondary education$$], ARRAY[$$Primary Education$$]),
  ($$Education, jobs & social protection$$, $$Higher Education$$, 3, $$sector$$, ARRAY[$$tertiary education$$, $$universities$$], ARRAY[$$Tertiary Education$$]),
  ($$Education, jobs & social protection$$, $$Skills & TVET$$, 4, $$sector$$, ARRAY[$$TVET$$, $$vocational training$$], '{}'::text[]),
  ($$Education, jobs & social protection$$, $$Social Protection$$, 5, $$sector$$, ARRAY[$$safety nets$$, $$social insurance$$, $$cash transfers$$], ARRAY[$$Social Protection$$]),
  ($$Education, jobs & social protection$$, $$Jobs & Labor Markets$$, 6, $$sector$$, ARRAY[$$employment policy$$, $$labor market$$], '{}'::text[]),
  ($$Education, jobs & social protection$$, $$Economic Inclusion & Livelihoods$$, 7, $$sector$$, ARRAY[$$livelihoods$$, $$graduation approach$$], '{}'::text[]),
  ($$Agriculture, food & land$$, $$Agribusiness & Value Chains$$, 1, $$sector$$, ARRAY[$$agribusiness$$, $$value chains$$], ARRAY[$$Agribusiness$$]),
  ($$Agriculture, food & land$$, $$Food Security$$, 2, $$sector$$, ARRAY[$$food systems$$, $$IPC$$], ARRAY[$$Food Security$$]),
  ($$Agriculture, food & land$$, $$Rural Development$$, 3, $$sector$$, ARRAY[$$community-driven development$$], ARRAY[$$Rural Development$$]),
  ($$Agriculture, food & land$$, $$Sustainable Agriculture$$, 4, $$sector$$, ARRAY[$$climate-smart agriculture$$, $$agroecology$$], ARRAY[$$Sustainable Farming$$]),
  ($$Agriculture, food & land$$, $$Irrigation & Drainage$$, 5, $$sector$$, ARRAY[$$irrigation$$], ARRAY[$$Irrigation Systems$$]),
  ($$Agriculture, food & land$$, $$Livestock & Animal Health$$, 6, $$sector$$, ARRAY[$$livestock$$, $$veterinary$$], '{}'::text[]),
  ($$Agriculture, food & land$$, $$Fisheries & Aquaculture$$, 7, $$sector$$, ARRAY[$$fisheries$$, $$aquaculture$$], '{}'::text[]),
  ($$Agriculture, food & land$$, $$Agricultural Research & Extension$$, 8, $$sector$$, ARRAY[$$extension services$$], '{}'::text[]),
  ($$Agriculture, food & land$$, $$Land Tenure & Administration$$, 9, $$sector$$, ARRAY[$$land rights$$, $$cadastre$$], '{}'::text[]),
  ($$Energy & extractives$$, $$Renewable Energy$$, 1, $$sector$$, ARRAY[$$solar$$, $$wind$$, $$geothermal$$, $$hydropower$$], ARRAY[$$Renewable Energy$$]),
  ($$Energy & extractives$$, $$Energy Access$$, 2, $$sector$$, ARRAY[$$off-grid$$, $$mini-grids$$, $$clean cooking$$], '{}'::text[]),
  ($$Energy & extractives$$, $$Energy Efficiency$$, 3, $$sector$$, '{}'::text[], ARRAY[$$Energy Efficiency$$]),
  ($$Energy & extractives$$, $$Power Sector & Utilities$$, 4, $$sector$$, ARRAY[$$utility reform$$, $$tariffs$$, $$transmission$$, $$grid$$], '{}'::text[]),
  ($$Energy & extractives$$, $$Extractive Industries$$, 5, $$sector$$, ARRAY[$$mining$$, $$oil and gas$$, $$EITI$$], '{}'::text[]),
  ($$Transport, cities & infrastructure$$, $$Transport Infrastructure$$, 1, $$sector$$, ARRAY[$$roads$$, $$rail$$, $$ports$$, $$airports$$], '{}'::text[]),
  ($$Transport, cities & infrastructure$$, $$Urban Mobility$$, 2, $$sector$$, ARRAY[$$public transport$$, $$BRT$$, $$e-mobility$$, $$non-motorized transport$$], ARRAY[$$Urban Transport$$]),
  ($$Transport, cities & infrastructure$$, $$Road Safety$$, 3, $$sector$$, '{}'::text[], ARRAY[$$Road Safety$$]),
  ($$Transport, cities & infrastructure$$, $$Urban Development$$, 4, $$sector$$, ARRAY[$$urban planning$$, $$municipal services$$, $$slum upgrading$$], '{}'::text[]),
  ($$Transport, cities & infrastructure$$, $$Housing$$, 5, $$sector$$, ARRAY[$$affordable housing$$, $$housing finance$$], '{}'::text[]),
  ($$Transport, cities & infrastructure$$, $$Solid Waste Management$$, 6, $$sector$$, ARRAY[$$municipal waste$$, $$recycling$$], '{}'::text[]),
  ($$Transport, cities & infrastructure$$, $$Public-Private Partnerships$$, 7, $$method$$, ARRAY[$$PPP$$, $$PPPs$$, $$project finance$$], ARRAY[$$Public-Private Partnerships$$]),
  ($$Digital & data$$, $$Digital Development & Connectivity$$, 1, $$sector$$, ARRAY[$$broadband$$, $$ICT policy$$, $$digital public infrastructure$$, $$DPI$$], '{}'::text[]),
  ($$Digital & data$$, $$Digital Governance$$, 2, $$sector$$, ARRAY[$$e-government$$, $$digital public services$$, $$GovTech$$], ARRAY[$$Digital Governance$$]),
  ($$Digital & data$$, $$Software Development$$, 3, $$method$$, ARRAY[$$web development$$, $$mobile apps$$], ARRAY[$$Web Development$$, $$Mobile App Development$$]),
  ($$Digital & data$$, $$Information Systems$$, 4, $$method$$, ARRAY[$$MIS$$, $$HMIS$$, $$EMIS$$, $$databases$$, $$cloud$$], ARRAY[$$Database Management$$, $$Cloud Architecture$$]),
  ($$Digital & data$$, $$Cybersecurity$$, 5, $$method$$, '{}'::text[], ARRAY[$$Cybersecurity$$]),
  ($$Digital & data$$, $$Data Science$$, 6, $$method$$, ARRAY[$$machine learning$$, $$Python$$, $$R$$], ARRAY[$$Data Science$$, $$Python/R$$]),
  ($$Digital & data$$, $$GIS & Remote Sensing$$, 7, $$method$$, ARRAY[$$GIS$$, $$geospatial$$, $$satellite imagery$$], ARRAY[$$GIS Mapping$$]),
  ($$Digital & data$$, $$Data Visualization$$, 8, $$method$$, ARRAY[$$dashboards$$, $$infographics$$], ARRAY[$$Infographics$$]),
  ($$Digital & data$$, $$Official Statistics$$, 9, $$sector$$, ARRAY[$$national statistical systems$$, $$censuses$$, $$NSO$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Financial Inclusion$$, 1, $$sector$$, ARRAY[$$microfinance$$, $$digital financial services$$], ARRAY[$$Financial Inclusion$$]),
  ($$Finance, trade & private sector$$, $$Financial Sector Development$$, 2, $$sector$$, ARRAY[$$banking$$, $$capital markets$$, $$financial regulation$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Insurance & Risk Finance$$, 3, $$sector$$, ARRAY[$$disaster risk finance$$, $$insurance$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$SME Development$$, 4, $$sector$$, ARRAY[$$MSME$$, $$SME support$$], ARRAY[$$SME Support$$]),
  ($$Finance, trade & private sector$$, $$Entrepreneurship & Innovation$$, 5, $$sector$$, ARRAY[$$startups$$, $$incubators$$, $$innovation ecosystems$$], ARRAY[$$Innovation Ecosystems$$]),
  ($$Finance, trade & private sector$$, $$Investment Climate$$, 6, $$sector$$, ARRAY[$$business environment$$, $$investment promotion$$], ARRAY[$$Investment Climate$$]),
  ($$Finance, trade & private sector$$, $$Trade & Competitiveness$$, 7, $$sector$$, ARRAY[$$trade policy$$, $$export promotion$$], ARRAY[$$Trade & Competitiveness$$]),
  ($$Finance, trade & private sector$$, $$Trade Facilitation & Customs$$, 8, $$sector$$, ARRAY[$$customs$$, $$border management$$, $$trade corridors$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Tourism Development$$, 9, $$sector$$, ARRAY[$$tourism$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Macroeconomic Policy$$, 10, $$sector$$, ARRAY[$$fiscal policy$$, $$monetary policy$$, $$debt management$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Tax Policy & Administration$$, 11, $$sector$$, ARRAY[$$domestic resource mobilization$$, $$revenue administration$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$Impact Investing & Blended Finance$$, 12, $$method$$, ARRAY[$$blended finance$$, $$impact investment$$], '{}'::text[]),
  ($$Finance, trade & private sector$$, $$ESG & Sustainability Reporting$$, 13, $$method$$, ARRAY[$$ESG$$, $$corporate sustainability$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Public Financial Management$$, 1, $$sector$$, ARRAY[$$PFM$$, $$budgeting$$, $$PEFA$$, $$treasury$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Public Procurement$$, 2, $$sector$$, ARRAY[$$procurement$$, $$e-procurement$$], ARRAY[$$Public Procurement$$]),
  ($$Governance & public sector$$, $$Anti-Corruption$$, 3, $$sector$$, ARRAY[$$integrity$$, $$transparency$$], ARRAY[$$Anti-Corruption$$]),
  ($$Governance & public sector$$, $$Justice & Rule of Law$$, 4, $$sector$$, ARRAY[$$justice reform$$, $$access to justice$$], ARRAY[$$Justice Reform$$]),
  ($$Governance & public sector$$, $$Public Sector Reform$$, 5, $$sector$$, ARRAY[$$civil service reform$$, $$institutional reform$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Decentralization & Local Governance$$, 6, $$sector$$, ARRAY[$$local government$$, $$municipal finance$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Democratic Governance & Elections$$, 7, $$sector$$, ARRAY[$$elections$$, $$parliaments$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Civil Society Strengthening$$, 8, $$sector$$, ARRAY[$$CSO capacity$$, $$civic space$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Media Development$$, 9, $$sector$$, ARRAY[$$media freedom$$, $$journalism$$], '{}'::text[]),
  ($$Governance & public sector$$, $$Citizen Engagement$$, 10, $$theme$$, ARRAY[$$social accountability$$, $$participation$$], ARRAY[$$Citizen Engagement$$]),
  ($$Governance & public sector$$, $$Human Rights$$, 11, $$theme$$, ARRAY[$$rights-based approaches$$], '{}'::text[]),
  ($$Climate & environment$$, $$Climate Adaptation$$, 1, $$theme$$, ARRAY[$$climate resilience$$], ARRAY[$$Climate Adaptation$$]),
  ($$Climate & environment$$, $$Climate Mitigation$$, 2, $$theme$$, ARRAY[$$decarbonization$$, $$low-carbon$$], ARRAY[$$Climate Mitigation$$]),
  ($$Climate & environment$$, $$Climate Finance$$, 3, $$theme$$, ARRAY[$$carbon markets$$, $$Article 6$$, $$GCF$$], '{}'::text[]),
  ($$Climate & environment$$, $$Disaster Risk Management$$, 4, $$theme$$, ARRAY[$$DRR$$, $$disaster risk reduction$$, $$resilience$$], '{}'::text[]),
  ($$Climate & environment$$, $$Environmental & Social Safeguards$$, 5, $$theme$$, ARRAY[$$E&S$$, $$ESIA$$, $$ESF$$, $$environmental impact assessment$$], '{}'::text[]),
  ($$Climate & environment$$, $$Biodiversity & Conservation$$, 6, $$theme$$, ARRAY[$$protected areas$$, $$conservation$$], ARRAY[$$Biodiversity$$]),
  ($$Climate & environment$$, $$Circular Economy$$, 7, $$theme$$, ARRAY[$$plastics$$, $$resource efficiency$$], ARRAY[$$Circular Economy$$]),
  ($$Climate & environment$$, $$Forestry & Land Use$$, 8, $$sector$$, ARRAY[$$forestry$$, $$REDD+$$, $$land restoration$$], '{}'::text[]),
  ($$Climate & environment$$, $$Water Resources Management$$, 9, $$sector$$, ARRAY[$$IWRM$$, $$river basins$$, $$transboundary water$$], ARRAY[$$Water Management$$]),
  ($$Climate & environment$$, $$Coastal & Marine Management$$, 10, $$sector$$, ARRAY[$$blue economy$$, $$oceans$$], '{}'::text[]),
  ($$Climate & environment$$, $$Pollution & Environmental Health$$, 11, $$sector$$, ARRAY[$$air quality$$, $$chemicals$$], '{}'::text[]),
  ($$Climate & environment$$, $$Hydromet & Early Warning$$, 12, $$sector$$, ARRAY[$$climate services$$, $$early warning systems$$], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Humanitarian Response$$, 1, $$sector$$, ARRAY[$$humanitarian aid$$, $$emergency response$$], ARRAY[$$Humanitarian Aid$$]),
  ($$Fragility, conflict & humanitarian$$, $$Shelter & Settlements$$, 2, $$sector$$, ARRAY[$$shelter$$, $$camp management$$], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Cash & Voucher Assistance$$, 3, $$method$$, ARRAY[$$CVA$$, $$humanitarian cash$$], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Child Protection$$, 4, $$theme$$, '{}'::text[], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Refugees & Forced Displacement$$, 5, $$theme$$, ARRAY[$$refugees$$, $$IDPs$$, $$forced displacement$$], ARRAY[$$Refugee Support$$]),
  ($$Fragility, conflict & humanitarian$$, $$Migration$$, 6, $$theme$$, ARRAY[$$labor migration$$, $$remittances$$], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Peacebuilding$$, 7, $$theme$$, ARRAY[$$conflict analysis$$, $$mediation$$, $$dialogue$$], ARRAY[$$Peacebuilding$$]),
  ($$Fragility, conflict & humanitarian$$, $$Social Cohesion$$, 8, $$theme$$, ARRAY[$$host communities$$], ARRAY[$$Social Cohesion$$]),
  ($$Fragility, conflict & humanitarian$$, $$Preventing Violent Extremism$$, 9, $$theme$$, ARRAY[$$P/CVE$$, $$CVE$$], '{}'::text[]),
  ($$Fragility, conflict & humanitarian$$, $$Post-Conflict Reconstruction$$, 10, $$theme$$, ARRAY[$$recovery$$, $$reconstruction$$], ARRAY[$$Post-Conflict Reconstruction$$]),
  ($$Fragility, conflict & humanitarian$$, $$Security Sector Reform$$, 11, $$sector$$, ARRAY[$$SSR$$, $$DDR$$], '{}'::text[]),
  ($$Gender & inclusion$$, $$Gender Mainstreaming$$, 1, $$theme$$, ARRAY[$$gender equality$$, $$gender analysis$$, $$gender-responsive budgeting$$], ARRAY[$$Gender Mainstreaming$$, $$Gender Budgeting$$]),
  ($$Gender & inclusion$$, $$Women's Economic Empowerment$$, 2, $$theme$$, ARRAY[$$WEE$$], '{}'::text[]),
  ($$Gender & inclusion$$, $$Gender-Based Violence$$, 3, $$theme$$, ARRAY[$$GBV$$, $$SEA$$], ARRAY[$$Gender-Based Violence$$]),
  ($$Gender & inclusion$$, $$Disability Inclusion$$, 4, $$theme$$, '{}'::text[], ARRAY[$$Disability Inclusion$$]),
  ($$Gender & inclusion$$, $$Indigenous Peoples$$, 5, $$theme$$, '{}'::text[], ARRAY[$$Indigenous Peoples$$]),
  ($$Gender & inclusion$$, $$Youth Development$$, 6, $$theme$$, ARRAY[$$youth$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Monitoring & Evaluation$$, 1, $$method$$, ARRAY[$$M&E$$, $$MEL$$, $$MEAL$$, $$results frameworks$$], ARRAY[$$Monitoring & Evaluation$$]),
  ($$Research, evaluation & analysis$$, $$Impact Evaluation$$, 2, $$method$$, ARRAY[$$RCTs$$, $$quasi-experimental$$], ARRAY[$$Impact Evaluation$$]),
  ($$Research, evaluation & analysis$$, $$Survey Design$$, 3, $$method$$, ARRAY[$$household surveys$$, $$fieldwork$$, $$sampling$$], ARRAY[$$Survey Design$$]),
  ($$Research, evaluation & analysis$$, $$Qualitative Research$$, 4, $$method$$, ARRAY[$$interviews$$, $$focus groups$$], ARRAY[$$Qualitative Research$$]),
  ($$Research, evaluation & analysis$$, $$Statistical Analysis$$, 5, $$method$$, ARRAY[$$statistics$$, $$Stata$$], ARRAY[$$Statistical Analysis$$]),
  ($$Research, evaluation & analysis$$, $$Econometrics$$, 6, $$method$$, '{}'::text[], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Evidence Synthesis$$, 7, $$method$$, ARRAY[$$systematic reviews$$, $$evidence gap maps$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Behavioral Insights$$, 8, $$method$$, ARRAY[$$behavioral science$$, $$nudges$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Policy Analysis$$, 9, $$method$$, '{}'::text[], ARRAY[$$Policy Analysis$$]),
  ($$Research, evaluation & analysis$$, $$Political Economy Analysis$$, 10, $$method$$, ARRAY[$$PEA$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Cost-Benefit Analysis$$, 11, $$method$$, ARRAY[$$CBA$$, $$economic analysis$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Poverty & Inequality Analysis$$, 12, $$method$$, ARRAY[$$poverty measurement$$], '{}'::text[]),
  ($$Research, evaluation & analysis$$, $$Financial Modeling$$, 13, $$method$$, '{}'::text[], ARRAY[$$Financial Modeling$$]),
  ($$Research, evaluation & analysis$$, $$Market Research$$, 14, $$method$$, ARRAY[$$market assessment$$, $$market systems analysis$$], ARRAY[$$Market Research$$]),
  ($$Program management & delivery$$, $$Project Management$$, 1, $$method$$, '{}'::text[], ARRAY[$$Project Management$$]),
  ($$Program management & delivery$$, $$Program Design & Proposal Writing$$, 2, $$method$$, ARRAY[$$theory of change$$, $$proposals$$, $$logframes$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Results-Based Financing$$, 3, $$method$$, ARRAY[$$RBF$$, $$PforR$$, $$impact bonds$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Grants & Contract Management$$, 4, $$method$$, ARRAY[$$compliance$$, $$award management$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Financial Management & Audit$$, 5, $$method$$, ARRAY[$$project financial management$$, $$audit$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Supply Chain & Logistics$$, 6, $$method$$, ARRAY[$$logistics$$, $$supply chain management$$], ARRAY[$$Logistics & Supply Chain$$]),
  ($$Program management & delivery$$, $$Change Management$$, 7, $$method$$, '{}'::text[], ARRAY[$$Change Management$$]),
  ($$Program management & delivery$$, $$Organizational Development$$, 8, $$method$$, ARRAY[$$institutional capacity assessment$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Stakeholder Engagement$$, 9, $$method$$, ARRAY[$$consultations$$, $$multi-stakeholder processes$$], ARRAY[$$Stakeholder Facilitation$$]),
  ($$Program management & delivery$$, $$Social & Behavior Change$$, 10, $$method$$, ARRAY[$$SBC$$, $$SBCC$$, $$behavior change communication$$], '{}'::text[]),
  ($$Program management & delivery$$, $$Human-Centered Design$$, 11, $$method$$, ARRAY[$$HCD$$, $$design thinking$$], '{}'::text[]),
  ($$Learning & capacity building$$, $$Capacity Building$$, 1, $$method$$, ARRAY[$$training$$, $$training of trainers$$, $$mentoring$$], ARRAY[$$Training of Trainers$$, $$Mentoring$$]),
  ($$Learning & capacity building$$, $$Workshop Facilitation$$, 2, $$method$$, ARRAY[$$facilitation$$], ARRAY[$$Workshop Facilitation$$]),
  ($$Learning & capacity building$$, $$Curriculum Design$$, 3, $$method$$, ARRAY[$$instructional design$$], ARRAY[$$Curriculum Design$$]),
  ($$Learning & capacity building$$, $$E-Learning$$, 4, $$method$$, ARRAY[$$online learning$$], ARRAY[$$E-Learning Development$$]),
  ($$Learning & capacity building$$, $$Knowledge Management$$, 5, $$method$$, ARRAY[$$KM$$, $$learning$$], '{}'::text[]),
  ($$Communications & languages$$, $$Technical Writing$$, 1, $$method$$, ARRAY[$$report writing$$], ARRAY[$$Technical Writing$$, $$Ghostwriting$$]),
  ($$Communications & languages$$, $$Policy Briefs$$, 2, $$method$$, ARRAY[$$policy writing$$], ARRAY[$$Policy Briefs$$]),
  ($$Communications & languages$$, $$Editing$$, 3, $$method$$, ARRAY[$$copyediting$$, $$proofreading$$], ARRAY[$$Academic Editing$$, $$Copywriting$$]),
  ($$Communications & languages$$, $$Strategic Communications$$, 4, $$method$$, ARRAY[$$media relations$$, $$social media$$, $$outreach$$], ARRAY[$$Media Relations$$, $$Social Media$$, $$Speechwriting$$, $$Public Outreach$$]),
  ($$Communications & languages$$, $$Advocacy$$, 5, $$method$$, ARRAY[$$campaigns$$], ARRAY[$$Advocacy Campaigns$$]),
  ($$Communications & languages$$, $$Graphic Design & Multimedia$$, 6, $$method$$, ARRAY[$$layout$$, $$video$$, $$photography$$], ARRAY[$$Brand Identity$$, $$Publication Layout$$, $$Motion Graphics$$, $$Photography$$]),
  ($$Communications & languages$$, $$Translation$$, 7, $$method$$, ARRAY[$$localization$$, $$subtitling$$], ARRAY[$$Translation$$, $$Localization$$, $$Transcreation$$, $$Subtitling$$]),
  ($$Communications & languages$$, $$Interpretation$$, 8, $$method$$, '{}'::text[], ARRAY[$$Interpretation$$])
) AS i(grp, name, sort_order, kind, aliases, legacy_names)
JOIN taxonomy_categories c ON c.type = 'expertise' AND c.name = i.grp
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_items t WHERE t.category_id = c.id AND t.name = i.name);

-- ---------------------------------------------------------------------------
-- Tier migration (§6, decision recorded in the data-foundations plan):
--   * each old item tag → the new item that absorbs it; two tags landing on
--     one item keep the higher tier;
--   * each old category-level tag → the best-evidenced new item among those
--     absorbing that category's own items (skipping items already held), at
--     the same tier;
--   * evidence = whole-word mentions of the item's name or absorbed old names
--     in the profile's headline, bio and portfolio;
--   * Core = the 3 best-evidenced primaries (ties: domain expertise before
--     skills, then original order); other primaries move to Strong ahead of
--     the secondaries (best-evidenced first); Strong beyond 5 becomes Working.
-- Kept until 012 so stragglers can be migrated once more after the merge.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ms_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT ' ' || trim(regexp_replace(replace(lower(coalesce(t, '')), '&', ' and '), '[^a-z0-9]+', ' ', 'g')) || ' '
$f$;

CREATE OR REPLACE FUNCTION ms_migrate_expertise(pid uuid) RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE
  evidence text;
  tag record;
  pick text;
  -- (name, tier rank: 1 primary / 2 secondary, source: 0 expertise / 1 skills, ordinal)
  names text[] := '{}';
  ranks int[] := '{}';
  srcs int[] := '{}';
  ords int[] := '{}';
  i int;
  result jsonb;
BEGIN
  SELECT ms_norm(concat_ws(' ', p.headline, p.detailed_bio,
           (SELECT string_agg(concat_ws(' ', pi.project_name, pi.role, pi.description, pi.results), ' ')
            FROM portfolio_items pi WHERE pi.profile_id = p.id)))
  INTO evidence FROM profiles p WHERE p.id = pid;

  -- 1. Item-level tags, then category-level tags, in original order.
  FOR tag IN
    SELECT t.name, t.lvl, CASE WHEN t.tier = 'primary' THEN 1 ELSE 2 END AS rank, t.src, t.ord
    FROM profiles p,
      LATERAL (
        SELECT e->>'name' AS name, coalesce(e->>'level', 'item') AS lvl, e->>'tier' AS tier, 0 AS src, o::int AS ord
        FROM jsonb_array_elements(p.expertise) WITH ORDINALITY AS x(e, o)
        UNION ALL
        SELECT e->>'name', coalesce(e->>'level', 'item'), e->>'tier', 1, o::int
        FROM jsonb_array_elements(p.skills) WITH ORDINALITY AS x(e, o)
      ) t
    WHERE p.id = pid
    ORDER BY (t.lvl = 'category'), t.src, t.ord
  LOOP
    pick := NULL;
    IF tag.lvl = 'category' THEN
      -- Candidates: new items absorbing an item of this old category, best
      -- evidence first, then the old category's own order.
      SELECT n.name INTO pick
      FROM taxonomy_categories oc
      JOIN taxonomy_items oi ON oi.category_id = oc.id
      JOIN taxonomy_items n ON oi.name = ANY (n.legacy_names)
      JOIN taxonomy_categories nc ON nc.id = n.category_id AND nc.type = 'expertise'
      WHERE oc.type IN ('domain_expertise', 'technical_skills') AND oc.name = tag.name
        AND NOT (n.name = ANY (names))
      GROUP BY n.name, n.legacy_names
      ORDER BY (SELECT sum(regexp_count(evidence, '\m' || trim(ms_norm(x)) || '\M'))
                FROM unnest(array_prepend(n.name, n.legacy_names)) AS x) DESC,
               min(oi.sort_order)
      LIMIT 1;
    ELSE
      SELECT n.name INTO pick
      FROM taxonomy_items n JOIN taxonomy_categories nc ON nc.id = n.category_id AND nc.type = 'expertise'
      WHERE tag.name = ANY (n.legacy_names)
      LIMIT 1;
    END IF;
    CONTINUE WHEN pick IS NULL;
    i := array_position(names, pick);
    IF i IS NULL THEN
      names := names || pick; ranks := ranks || tag.rank; srcs := srcs || tag.src; ords := ords || tag.ord;
    ELSIF tag.rank < ranks[i] THEN
      ranks[i] := tag.rank;  -- the higher tier wins
    END IF;
  END LOOP;

  -- 2. Order by tier rank and evidence, then cut into Core / Strong / Working.
  WITH t AS (
    SELECT u.name, u.rank, u.src, u.ord,
           (SELECT coalesce(sum(regexp_count(evidence, '\m' || trim(ms_norm(x)) || '\M')), 0)
            FROM taxonomy_items n JOIN taxonomy_categories nc ON nc.id = n.category_id AND nc.type = 'expertise',
                 unnest(array_prepend(n.name, n.legacy_names)) AS x
            WHERE n.name = u.name) AS score
    FROM unnest(names, ranks, srcs, ords) AS u(name, rank, src, ord)
  ),
  primaries AS (
    SELECT name, row_number() OVER (ORDER BY score DESC, src, ord) AS pos FROM t WHERE rank = 1
  ),
  rest AS (
    SELECT name, row_number() OVER (ORDER BY rank, score DESC, src, ord) AS pos
    FROM t WHERE name NOT IN (SELECT name FROM primaries WHERE pos <= 3)
  ),
  ordered AS (
    SELECT name, 'core' AS tier, pos AS seq FROM primaries WHERE pos <= 3
    UNION ALL
    SELECT name, CASE WHEN pos <= 5 THEN 'strong' ELSE 'working' END, 100 + pos FROM rest WHERE pos <= 15
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'tier', tier) ORDER BY seq), '[]'::jsonb)
  INTO result FROM ordered;
  RETURN result;
END
$f$;

UPDATE profiles
SET tiered_expertise = ms_migrate_expertise(id)
WHERE tiered_expertise = '[]'::jsonb AND (expertise <> '[]'::jsonb OR skills <> '[]'::jsonb);

-- Pending requests made against the old lists keep their type here; the admin
-- queue on this branch approves them into the unified list, and 012 retypes any
-- left after the merge.
