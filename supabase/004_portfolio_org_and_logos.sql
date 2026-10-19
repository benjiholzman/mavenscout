-- 004: portfolio organization + years, and work-history logo links.
--
-- Run once in the Supabase SQL editor on a database that already ran 000–003.
-- Safe to re-run: the columns use IF NOT EXISTS and the updates are idempotent.
-- On a fresh project, 000 already creates the columns, so the ALTER is a no-op.

-- 1. Portfolio organization and dates ----------------------------------------

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS start_year   int,
  ADD COLUMN IF NOT EXISTS end_year     int;   -- NULL = ongoing; = start_year for a single year

-- Seeded items, matched on profile handle + exact project name. Organization is
-- the client/funder; years sit inside the matching work-history span.
UPDATE portfolio_items pi
SET organization = v.organization,
    start_year   = v.start_year,
    end_year     = v.end_year
FROM (VALUES
  ($$amara-diallo$$, $$M&E Framework for USAID Youth Employment Program, Ghana$$, $$USAID$$, 2022, 2023),
  ($$amara-diallo$$, $$Gender-Sensitive Impact Evaluation, FCDO Skills Programme, Rwanda$$, $$FCDO$$, 2021, 2022),
  ($$amara-diallo$$, $$GBV Prevention Program Review, UN Women, DRC$$, $$UN Women$$, 2019, 2020),
  ($$dr-kwame-asante$$, $$National Basic Education Curriculum Reform, Ghana Education Service$$, $$Ghana Education Service$$, 2018, 2022),
  ($$dr-kwame-asante$$, $$Teacher Professional Development Framework, UNICEF Sierra Leone$$, $$UNICEF Sierra Leone$$, 2016, 2017),
  ($$dr-kwame-asante$$, $$Learning Assessment System Design, GPE Program, Liberia$$, $$Global Partnership for Education$$, 2014, 2015),
  ($$dr-priya-nair$$, $$UHC Financing Roadmap, Ministry of Health, Nepal$$, $$WHO$$, 2019, 2020),
  ($$dr-priya-nair$$, $$Primary Health Care Investment Case, World Bank, Bangladesh$$, $$World Bank$$, 2013, 2015),
  ($$dr-priya-nair$$, $$Pandemic Preparedness Capacity Assessment, WHO SEARO, Five Countries$$, $$WHO SEARO$$, 2017, 2018),
  ($$dr-sunita-patel$$, $$Shock-Responsive Social Protection Assessment, Philippines$$, $$ADB$$, 2022, 2023),
  ($$dr-sunita-patel$$, $$Gender-Transformative Cash Transfer Design, UNICEF, Indonesia$$, $$UNICEF Indonesia$$, 2014, 2016),
  ($$dr-sunita-patel$$, $$Social Protection Floor Costing Study, ADB, Cambodia$$, $$ADB$$, 2019, 2020),
  ($$ecoclimate-partners$$, $$Nature-Based Solutions Investment Case, Congo Basin Forest, FCDO$$, $$FCDO$$, 2021, 2022),
  ($$ecoclimate-partners$$, $$Biodiversity Safeguard Framework, IFC Portfolio, Sub-Saharan Africa$$, $$IFC$$, 2018, 2019),
  ($$ecoclimate-partners$$, $$Coral Reef Ecosystem Services Valuation, Pacific Region, EU$$, $$European Union$$, 2016, 2017),
  ($$fatima-al-rashid$$, $$Durable Solutions Research, Syrian Refugees in Jordan, UNHCR$$, $$UNHCR Jordan$$, 2024, NULL),
  ($$fatima-al-rashid$$, $$GBV Response Program Learning Study, IRC, Lebanon$$, $$IRC$$, 2022, 2023),
  ($$fatima-al-rashid$$, $$Legal Identity and Service Access Research, South Sudanese Refugees, Kenya$$, $$IRC$$, 2021, 2021),
  ($$ifeoma-obi-and-associates$$, $$Smallholder Rice Value Chain Development, IFAD, Nigeria$$, $$IFAD$$, 2019, 2022),
  ($$ifeoma-obi-and-associates$$, $$Agri-Finance Product Design, LAPO Microfinance Bank, Nigeria$$, $$LAPO Microfinance Bank$$, 2021, 2021),
  ($$ifeoma-obi-and-associates$$, $$Food Systems Resilience Assessment, FAO, Sahel Region$$, $$FAO$$, 2022, 2023),
  ($$james-okafor$$, $$Coastal Erosion Vulnerability Atlas, Niger Delta Region$$, $$UNDP Nigeria$$, 2022, 2022),
  ($$james-okafor$$, $$Deforestation Monitoring Dashboard, SERVIR West Africa$$, $$SERVIR West Africa$$, 2023, NULL),
  ($$james-okafor$$, $$Urban Heat Island Mapping, UNDP Cities Program, Kano$$, $$UNDP Nigeria$$, 2021, 2022),
  ($$lena-hoffmann$$, $$National Open Data Portal, Government of Ukraine$$, $$GIZ$$, 2015, 2017),
  ($$lena-hoffmann$$, $$Digital Identity Framework, Government of Rwanda$$, $$GIZ$$, 2019, 2020),
  ($$lena-hoffmann$$, $$Anti-Corruption Digital Disclosure System, GIZ Georgia$$, $$GIZ$$, 2017, 2018),
  ($$mei-ling-chen$$, $$Sovereign Green Bond Framework, Royal Government of Thailand$$, $$ADB$$, 2019, 2020),
  ($$mei-ling-chen$$, $$GCF Readiness Program, Government of Cambodia$$, $$ADB$$, 2021, 2022),
  ($$mei-ling-chen$$, $$Carbon Credit Methodology for Off-Grid Solar, Mekong Region$$, $$IFC$$, 2016, 2017),
  ($$northstar-advisory-group$$, $$PFM Reform Program, MCC Compact, El Salvador$$, $$Millennium Challenge Corporation$$, 2016, 2020),
  ($$northstar-advisory-group$$, $$Domestic Revenue Mobilization Support, USAID, Senegal$$, $$USAID$$, 2017, 2019),
  ($$northstar-advisory-group$$, $$Anti-Corruption Institutional Assessment, USAID, Philippines$$, $$USAID$$, 2012, 2013),
  ($$pablo-vargas$$, $$RCT Evaluation of Conditional Cash Transfer Scale-Up, Peru$$, $$GRADE$$, 2020, 2022),
  ($$pablo-vargas$$, $$Labor Market Impact Evaluation, Youth Employment Program, Ecuador$$, $$J-PAL LAC$$, 2023, 2024),
  ($$pablo-vargas$$, $$Social Registry Data Quality Assessment, IDB, Bolivia$$, $$IDB$$, 2024, 2024),
  ($$rohan-mehta$$, $$Climate Vulnerability Assessment, Bangladesh Delta Region$$, $$UNICEF Bangladesh$$, 2022, 2023),
  ($$rohan-mehta$$, $$Cyclone-Resilient Water Supply Design, Odisha State, India$$, $$World Bank$$, 2019, 2021),
  ($$rohan-mehta$$, $$Urban Sanitation Resilience Plan, Dhaka North City Corporation$$, $$World Bank$$, 2021, 2022),
  ($$sofia-reyes$$, $$Municipal Peace Plan Design, Tumaco & Buenaventura, Colombia$$, $$Search for Common Ground$$, 2017, 2018),
  ($$sofia-reyes$$, $$Conflict Sensitivity Assessment, USAID Economic Recovery Program, El Salvador$$, $$USAID$$, 2020, 2021),
  ($$sofia-reyes$$, $$Ex-Combatant Reintegration Evaluation, UNODC, Colombia$$, $$UNODC$$, 2018, 2018),
  ($$tariq-hassan$$, $$Amman Bus Rapid Transit Pre-Feasibility Study, Jordan$$, $$Islamic Development Bank$$, 2017, 2018),
  ($$tariq-hassan$$, $$Road Safety Investment Program, AfDB, Morocco & Tunisia$$, $$African Development Bank$$, 2020, 2022),
  ($$tariq-hassan$$, $$National Transport Strategy, Republic of Lebanon$$, $$World Bank$$, 2021, 2022)
) AS v(handle, project_name, organization, start_year, end_year)
JOIN profiles p ON p.handle = v.handle
WHERE pi.profile_id = p.id
  AND pi.project_name = v.project_name;

-- 2. Work-history logo links -------------------------------------------------
-- Domains come from Brandfetch Brand Search, checked by hand against each
-- organization. Stored as id-free Logo Links (https://cdn.brandfetch.io/<domain>);
-- the app adds the client id at render (src/lib/brandfetch.ts resolveLogoUrl),
-- so no Brandfetch id lives in the database or this file.
-- Deliberately left without a logo (initials shown): Ghana Education Service and
-- UN Peacebuilding Fund (not in Brandfetch), and European Commission, DG CONNECT
-- (only europa.eu is indexed, attributed to a different EU body).
-- Only fills empty logo_url values, so re-running never overwrites a chosen logo.
WITH logo_map(organization, domain) AS (VALUES
  ($$Palladium Group$$,                                               $$thepalladiumgroup.com$$),
  ($$UN Women$$,                                                      $$unwomen.org$$),
  ($$Innovations for Poverty Action$$,                                $$poverty-action.org$$),
  ($$UNESCO IIEP$$,                                                   $$unesco.org$$),
  ($$University of Cape Coast$$,                                      $$ucc.edu.gh$$),
  ($$World Health Organization$$,                                     $$who.int$$),
  ($$World Bank Group$$,                                              $$worldbank.org$$),
  ($$All India Institute of Medical Sciences$$,                       $$aiims.edu$$),
  ($$Asian Development Bank$$,                                        $$adb.org$$),
  ($$UNICEF East Asia & Pacific$$,                                    $$unicef.org$$),
  ($$Australian National University$$,                                $$anu.edu.au$$),
  ($$UNHCR Jordan$$,                                                  $$unhcr.org$$),
  ($$International Rescue Committee$$,                                $$rescue.org$$),
  ($$SERVIR West Africa / RCMRD$$,                                    $$servir.net$$),
  ($$UNDP Nigeria$$,                                                  $$undp.org$$),
  ($$GIZ (Deutsche Gesellschaft für Internationale Zusammenarbeit)$$, $$giz.de$$),
  ($$ThoughtWorks$$,                                                  $$thoughtworks.com$$),
  ($$IFC (International Finance Corporation)$$,                       $$ifc.org$$),
  ($$J-PAL Latin America and the Caribbean$$,                         $$povertyactionlab.org$$),
  ($$Grupo de Análisis para el Desarrollo (GRADE)$$,                  $$grade.org.pe$$),
  ($$UNICEF Bangladesh$$,                                             $$unicef.org$$),
  ($$World Bank South Asia$$,                                         $$worldbank.org$$),
  ($$BRAC$$,                                                          $$brac.net$$),
  ($$USAID Colombia Mission$$,                                        $$usaid.gov$$),
  ($$Search for Common Ground$$,                                      $$sfcg.org$$),
  ($$AECOM$$,                                                         $$aecom.com$$),
  ($$Atkins Global$$,                                                 $$atkinsglobal.com$$)
)
UPDATE profiles p
SET work_history = (
  SELECT jsonb_agg(
           CASE WHEN m.domain IS NOT NULL AND coalesce(e.w->>'logo_url', '') = ''
                THEN jsonb_set(e.w, '{logo_url}', to_jsonb('https://cdn.brandfetch.io/' || m.domain))
                ELSE e.w
           END
           ORDER BY e.ord)
  FROM jsonb_array_elements(p.work_history) WITH ORDINALITY AS e(w, ord)
  LEFT JOIN logo_map m ON m.organization = e.w->>'organization'
)
WHERE jsonb_array_length(p.work_history) > 0;
