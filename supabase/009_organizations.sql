-- 009: canonical organizations list (docs/MavenScout-profiles-membership.md §8).
--
-- Run once in the Supabase SQL editor on a database that already ran 000–008.
-- Safe to re-run: the table and column use IF NOT EXISTS, the policies are
-- dropped and re-created, and seed rows insert ON CONFLICT (name) DO NOTHING
-- (so an admin's edits to a seeded row survive a re-run).
--
-- ADDITIVE ONLY. No existing row is changed: work-history employers and
-- portfolio clients stay free text exactly as stored. The app resolves them to
-- an organization at read time by name or alias (src/lib/organizations.ts,
-- resolveOrganization), and stores organization_id only when someone picks an
-- organization in the editor. Code on main ignores the new table and column.

-- ---------------------------------------------------------------------------
-- organizations — one row per organization, used wherever an organization
-- appears: employer and client pickers, logos and Sector Experience, Org
-- History matching; later referee and hiring-manager email checks (§4.6, §9).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  aliases    text[] NOT NULL DEFAULT '{}',  -- short and former names: 'WB', 'IBRD', 'DFID'
  domains    text[] NOT NULL DEFAULT '{}',  -- web/email domains, primary first
  logo_url   text,                          -- explicit logo; NULL = from domains[0] via Brandfetch (orgLogoUrl)
  type       text NOT NULL CHECK (type IN ('multilateral','bilateral_donor','un_agency','ngo','government','private_firm','academic','foundation')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; INSERT/UPDATE/DELETE admin-only.
DROP POLICY IF EXISTS "dev_read_organizations"  ON organizations;
DROP POLICY IF EXISTS "dev_write_organizations" ON organizations;
CREATE POLICY "dev_read_organizations"  ON organizations FOR SELECT USING (true);
CREATE POLICY "dev_write_organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON organizations TO anon, authenticated;

-- Portfolio client picked from the list (NULL = free text in `organization`).
ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Seed: 200 organizations covering most of international development, including
-- every international organization named in the seeded profiles. Domains are
-- primary domains only (left empty where unsure); shared domains such as
-- gov.uk are avoided. The two earlier hand-checked logo maps (004's logo_map
-- and scripts/demo-seed/vocab.mjs LOGO_PREFIXES) are folded in. Pseudo-
-- employers ("Independent consultant", "Freelance") are deliberately absent.
-- ---------------------------------------------------------------------------
INSERT INTO organizations (name, aliases, domains, type) VALUES
  -- Multilateral development banks, IFIs, funds and regional bodies
  ($$World Bank$$, ARRAY[$$WB$$, $$World Bank Group$$, $$WBG$$, $$IBRD$$, $$IDA$$, $$International Bank for Reconstruction and Development$$, $$International Development Association$$], ARRAY[$$worldbank.org$$], 'multilateral'),
  ($$International Finance Corporation$$, ARRAY[$$IFC$$], ARRAY[$$ifc.org$$], 'multilateral'),
  ($$International Monetary Fund$$, ARRAY[$$IMF$$], ARRAY[$$imf.org$$], 'multilateral'),
  ($$Asian Development Bank$$, ARRAY[$$ADB$$], ARRAY[$$adb.org$$], 'multilateral'),
  ($$African Development Bank$$, ARRAY[$$AfDB$$, $$African Development Bank Group$$], ARRAY[$$afdb.org$$], 'multilateral'),
  ($$Inter-American Development Bank$$, ARRAY[$$IDB$$, $$IADB$$, $$BID$$, $$IDB Invest$$], ARRAY[$$iadb.org$$, $$idbinvest.org$$], 'multilateral'),
  ($$European Bank for Reconstruction and Development$$, ARRAY[$$EBRD$$], ARRAY[$$ebrd.com$$], 'multilateral'),
  ($$European Investment Bank$$, ARRAY[$$EIB$$], ARRAY[$$eib.org$$], 'multilateral'),
  ($$Islamic Development Bank$$, ARRAY[$$IsDB$$], ARRAY[$$isdb.org$$], 'multilateral'),
  ($$Asian Infrastructure Investment Bank$$, ARRAY[$$AIIB$$], ARRAY[$$aiib.org$$], 'multilateral'),
  ($$CAF Development Bank of Latin America$$, ARRAY[$$CAF$$, $$Corporación Andina de Fomento$$, $$CAF Development Bank of Latin America and the Caribbean$$], ARRAY[$$caf.com$$], 'multilateral'),
  ($$Global Fund to Fight AIDS, Tuberculosis and Malaria$$, ARRAY[$$Global Fund$$, $$The Global Fund$$], ARRAY[$$theglobalfund.org$$], 'multilateral'),
  ($$Gavi, the Vaccine Alliance$$, ARRAY[$$Gavi$$], ARRAY[$$gavi.org$$], 'multilateral'),
  ($$Global Partnership for Education$$, ARRAY[$$GPE$$], ARRAY[$$globalpartnership.org$$], 'multilateral'),
  ($$Green Climate Fund$$, ARRAY[$$GCF$$], ARRAY[$$greenclimate.fund$$], 'multilateral'),
  ($$Global Environment Facility$$, ARRAY[$$GEF$$], ARRAY[$$thegef.org$$], 'multilateral'),
  ($$Climate Investment Funds$$, ARRAY[$$CIF$$], ARRAY[$$cif.org$$], 'multilateral'),
  ($$CGIAR$$, '{}'::text[], ARRAY[$$cgiar.org$$], 'multilateral'),
  ($$OECD$$, ARRAY[$$Organisation for Economic Co-operation and Development$$, $$OECD DAC$$], ARRAY[$$oecd.org$$], 'multilateral'),
  ($$European Union$$, ARRAY[$$EU$$, $$European Commission$$, $$EC$$, $$EuropeAid$$, $$DG INTPA$$, $$DG ECHO$$, $$ECHO$$, $$DG NEAR$$, $$DG CONNECT$$], ARRAY[$$europa.eu$$, $$ec.europa.eu$$], 'multilateral'),
  ($$African Union$$, ARRAY[$$AU$$, $$African Union Commission$$], ARRAY[$$au.int$$], 'multilateral'),
  ($$ECOWAS$$, ARRAY[$$Economic Community of West African States$$], ARRAY[$$ecowas.int$$], 'multilateral'),
  ($$IGAD$$, ARRAY[$$Intergovernmental Authority on Development$$], ARRAY[$$igad.int$$], 'multilateral'),
  ($$SIECA$$, ARRAY[$$Secretaría de Integración Económica Centroamericana$$], ARRAY[$$sieca.int$$], 'multilateral'),
  ($$ICIMOD$$, ARRAY[$$International Centre for Integrated Mountain Development$$], ARRAY[$$icimod.org$$], 'multilateral'),
  -- UN system
  ($$United Nations$$, ARRAY[$$UN Secretariat$$, $$UN DESA$$], ARRAY[$$un.org$$], 'un_agency'),
  ($$UNDP$$, ARRAY[$$United Nations Development Programme$$], ARRAY[$$undp.org$$], 'un_agency'),
  ($$UNICEF$$, ARRAY[$$United Nations Children's Fund$$], ARRAY[$$unicef.org$$], 'un_agency'),
  ($$UNHCR$$, ARRAY[$$UN Refugee Agency$$, $$United Nations High Commissioner for Refugees$$], ARRAY[$$unhcr.org$$], 'un_agency'),
  ($$World Food Programme$$, ARRAY[$$WFP$$, $$UN World Food Programme$$], ARRAY[$$wfp.org$$], 'un_agency'),
  ($$FAO$$, ARRAY[$$Food and Agriculture Organization$$, $$Food and Agriculture Organization of the United Nations$$], ARRAY[$$fao.org$$], 'un_agency'),
  ($$World Health Organization$$, ARRAY[$$WHO$$], ARRAY[$$who.int$$], 'un_agency'),
  ($$UNFPA$$, ARRAY[$$United Nations Population Fund$$], ARRAY[$$unfpa.org$$], 'un_agency'),
  ($$UN Women$$, ARRAY[$$United Nations Entity for Gender Equality and the Empowerment of Women$$], ARRAY[$$unwomen.org$$], 'un_agency'),
  ($$UNESCO$$, ARRAY[$$United Nations Educational, Scientific and Cultural Organization$$], ARRAY[$$unesco.org$$], 'un_agency'),
  ($$International Labour Organization$$, ARRAY[$$ILO$$], ARRAY[$$ilo.org$$], 'un_agency'),
  ($$UN Environment Programme$$, ARRAY[$$UNEP$$], ARRAY[$$unep.org$$], 'un_agency'),
  ($$UN-Habitat$$, ARRAY[$$UN Habitat$$], ARRAY[$$unhabitat.org$$], 'un_agency'),
  ($$UNOPS$$, ARRAY[$$United Nations Office for Project Services$$], ARRAY[$$unops.org$$], 'un_agency'),
  ($$UNIDO$$, ARRAY[$$United Nations Industrial Development Organization$$], ARRAY[$$unido.org$$], 'un_agency'),
  ($$UNCTAD$$, ARRAY[$$UN Trade and Development$$], ARRAY[$$unctad.org$$], 'un_agency'),
  ($$OCHA$$, ARRAY[$$UN OCHA$$, $$UNOCHA$$, $$Office for the Coordination of Humanitarian Affairs$$], ARRAY[$$unocha.org$$], 'un_agency'),
  ($$OHCHR$$, ARRAY[$$UN Human Rights$$, $$Office of the High Commissioner for Human Rights$$], ARRAY[$$ohchr.org$$], 'un_agency'),
  ($$UNAIDS$$, '{}'::text[], ARRAY[$$unaids.org$$], 'un_agency'),
  ($$UNODC$$, ARRAY[$$United Nations Office on Drugs and Crime$$], ARRAY[$$unodc.org$$], 'un_agency'),
  ($$UNCDF$$, ARRAY[$$UN Capital Development Fund$$], ARRAY[$$uncdf.org$$], 'un_agency'),
  ($$UNRWA$$, '{}'::text[], ARRAY[$$unrwa.org$$], 'un_agency'),
  ($$IOM$$, ARRAY[$$International Organization for Migration$$, $$UN Migration$$], ARRAY[$$iom.int$$], 'un_agency'),
  ($$IFAD$$, ARRAY[$$International Fund for Agricultural Development$$], ARRAY[$$ifad.org$$], 'un_agency'),
  ($$International Trade Centre$$, ARRAY[$$ITC$$], ARRAY[$$intracen.org$$], 'un_agency'),
  ($$UNFCCC$$, ARRAY[$$UN Climate Change$$], ARRAY[$$unfccc.int$$], 'un_agency'),
  ($$UNDRR$$, ARRAY[$$UN Office for Disaster Risk Reduction$$], ARRAY[$$undrr.org$$], 'un_agency'),
  ($$UN Economic Commission for Africa$$, ARRAY[$$UNECA$$, $$ECA$$], ARRAY[$$uneca.org$$], 'un_agency'),
  ($$UN Peacebuilding Fund$$, ARRAY[$$PBF$$], '{}'::text[], 'un_agency'),
  -- Bilateral donors and development finance institutions
  ($$USAID$$, ARRAY[$$United States Agency for International Development$$], ARRAY[$$usaid.gov$$], 'bilateral_donor'),
  ($$Millennium Challenge Corporation$$, ARRAY[$$MCC$$], ARRAY[$$mcc.gov$$], 'bilateral_donor'),
  ($$FCDO$$, ARRAY[$$Foreign, Commonwealth & Development Office$$, $$DFID$$, $$Department for International Development$$, $$UK Aid$$], ARRAY[$$fcdo.gov.uk$$, $$dfid.gov.uk$$], 'bilateral_donor'),
  ($$British International Investment$$, ARRAY[$$BII$$, $$CDC Group$$], ARRAY[$$bii.co.uk$$], 'bilateral_donor'),
  ($$GIZ$$, ARRAY[$$Deutsche Gesellschaft für Internationale Zusammenarbeit$$], ARRAY[$$giz.de$$], 'bilateral_donor'),
  ($$KfW Development Bank$$, ARRAY[$$KfW$$, $$KfW Entwicklungsbank$$], ARRAY[$$kfw.de$$, $$kfw-entwicklungsbank.de$$], 'bilateral_donor'),
  ($$BMZ$$, ARRAY[$$German Federal Ministry for Economic Cooperation and Development$$], ARRAY[$$bmz.de$$], 'bilateral_donor'),
  ($$Agence Française de Développement$$, ARRAY[$$AFD$$], ARRAY[$$afd.fr$$], 'bilateral_donor'),
  ($$Expertise France$$, '{}'::text[], ARRAY[$$expertisefrance.fr$$], 'bilateral_donor'),
  ($$JICA$$, ARRAY[$$Japan International Cooperation Agency$$], ARRAY[$$jica.go.jp$$], 'bilateral_donor'),
  ($$KOICA$$, ARRAY[$$Korea International Cooperation Agency$$], ARRAY[$$koica.go.kr$$], 'bilateral_donor'),
  ($$Global Affairs Canada$$, ARRAY[$$GAC$$], ARRAY[$$international.gc.ca$$], 'bilateral_donor'),
  ($$DFAT$$, ARRAY[$$Australian Department of Foreign Affairs and Trade$$, $$Department of Foreign Affairs and Trade$$], ARRAY[$$dfat.gov.au$$], 'bilateral_donor'),
  ($$New Zealand Ministry of Foreign Affairs and Trade$$, ARRAY[$$MFAT$$], ARRAY[$$mfat.govt.nz$$], 'bilateral_donor'),
  ($$Sida$$, ARRAY[$$Swedish International Development Cooperation Agency$$], ARRAY[$$sida.se$$], 'bilateral_donor'),
  ($$Norad$$, ARRAY[$$Norwegian Agency for Development Cooperation$$], ARRAY[$$norad.no$$], 'bilateral_donor'),
  ($$Danish Ministry of Foreign Affairs$$, ARRAY[$$Danida$$], ARRAY[$$um.dk$$], 'bilateral_donor'),
  ($$Netherlands Ministry of Foreign Affairs$$, ARRAY[$$Government of the Netherlands$$, $$Dutch Ministry of Foreign Affairs$$], ARRAY[$$minbuza.nl$$], 'bilateral_donor'),
  ($$FMO$$, ARRAY[$$Dutch Entrepreneurial Development Bank$$], ARRAY[$$fmo.nl$$], 'bilateral_donor'),
  ($$Enabel$$, ARRAY[$$Belgian Development Agency$$], ARRAY[$$enabel.be$$], 'bilateral_donor'),
  ($$Swiss Agency for Development and Cooperation$$, ARRAY[$$SDC$$, $$DEZA$$], ARRAY[$$eda.admin.ch$$], 'bilateral_donor'),
  ($$Irish Aid$$, '{}'::text[], ARRAY[$$irishaid.ie$$], 'bilateral_donor'),
  ($$AECID$$, ARRAY[$$Spanish Agency for International Development Cooperation$$], ARRAY[$$aecid.es$$], 'bilateral_donor'),
  -- NGOs and nonprofit implementers
  ($$International Rescue Committee$$, ARRAY[$$IRC$$], ARRAY[$$rescue.org$$], 'ngo'),
  ($$Save the Children$$, '{}'::text[], ARRAY[$$savethechildren.org$$, $$savethechildren.net$$], 'ngo'),
  ($$Oxfam$$, ARRAY[$$Oxfam International$$], ARRAY[$$oxfam.org$$], 'ngo'),
  ($$CARE International$$, ARRAY[$$CARE$$], ARRAY[$$care.org$$, $$care-international.org$$], 'ngo'),
  ($$Mercy Corps$$, '{}'::text[], ARRAY[$$mercycorps.org$$], 'ngo'),
  ($$World Vision$$, ARRAY[$$World Vision International$$], ARRAY[$$wvi.org$$, $$worldvision.org$$], 'ngo'),
  ($$Plan International$$, '{}'::text[], ARRAY[$$plan-international.org$$], 'ngo'),
  ($$Norwegian Refugee Council$$, ARRAY[$$NRC$$], ARRAY[$$nrc.no$$], 'ngo'),
  ($$Danish Refugee Council$$, ARRAY[$$DRC$$], ARRAY[$$drc.ngo$$], 'ngo'),
  ($$Médecins Sans Frontières$$, ARRAY[$$MSF$$, $$Doctors Without Borders$$], ARRAY[$$msf.org$$], 'ngo'),
  ($$Action Against Hunger$$, ARRAY[$$ACF$$, $$Action contre la Faim$$], ARRAY[$$actionagainsthunger.org$$], 'ngo'),
  ($$ICRC$$, ARRAY[$$International Committee of the Red Cross$$], ARRAY[$$icrc.org$$], 'ngo'),
  ($$IFRC$$, ARRAY[$$International Federation of Red Cross and Red Crescent Societies$$], ARRAY[$$ifrc.org$$], 'ngo'),
  ($$BRAC$$, '{}'::text[], ARRAY[$$brac.net$$], 'ngo'),
  ($$Catholic Relief Services$$, ARRAY[$$CRS$$], ARRAY[$$crs.org$$], 'ngo'),
  ($$FHI 360$$, '{}'::text[], ARRAY[$$fhi360.org$$], 'ngo'),
  ($$Pact$$, '{}'::text[], ARRAY[$$pactworld.org$$], 'ngo'),
  ($$PATH$$, '{}'::text[], ARRAY[$$path.org$$], 'ngo'),
  ($$Jhpiego$$, '{}'::text[], ARRAY[$$jhpiego.org$$], 'ngo'),
  ($$Innovations for Poverty Action$$, ARRAY[$$IPA$$], ARRAY[$$poverty-action.org$$], 'ngo'),
  ($$IDinsight$$, '{}'::text[], ARRAY[$$idinsight.org$$], 'ngo'),
  ($$3ie$$, ARRAY[$$International Initiative for Impact Evaluation$$], ARRAY[$$3ieimpact.org$$], 'ngo'),
  ($$Search for Common Ground$$, ARRAY[$$SFCG$$], ARRAY[$$sfcg.org$$], 'ngo'),
  ($$International Alert$$, '{}'::text[], ARRAY[$$international-alert.org$$], 'ngo'),
  ($$Concern Worldwide$$, '{}'::text[], ARRAY[$$concern.net$$], 'ngo'),
  ($$Welthungerhilfe$$, '{}'::text[], ARRAY[$$welthungerhilfe.de$$], 'ngo'),
  ($$Helvetas$$, '{}'::text[], ARRAY[$$helvetas.org$$], 'ngo'),
  ($$SNV$$, ARRAY[$$SNV Netherlands Development Organisation$$], ARRAY[$$snv.org$$], 'ngo'),
  ($$Humanity & Inclusion$$, ARRAY[$$HI$$, $$Handicap International$$], ARRAY[$$hi.org$$], 'ngo'),
  ($$CBM$$, ARRAY[$$CBM Global$$, $$Christian Blind Mission$$], ARRAY[$$cbm.org$$], 'ngo'),
  ($$WaterAid$$, '{}'::text[], ARRAY[$$wateraid.org$$], 'ngo'),
  ($$ActionAid$$, ARRAY[$$ActionAid International$$], ARRAY[$$actionaid.org$$], 'ngo'),
  ($$Islamic Relief Worldwide$$, ARRAY[$$Islamic Relief$$], ARRAY[$$islamic-relief.org$$], 'ngo'),
  ($$Transparency International$$, ARRAY[$$TI$$], ARRAY[$$transparency.org$$], 'ngo'),
  ($$Open Contracting Partnership$$, ARRAY[$$OCP$$], ARRAY[$$open-contracting.org$$], 'ngo'),
  ($$CoST – Infrastructure Transparency Initiative$$, ARRAY[$$CoST$$, $$Infrastructure Transparency Initiative$$], ARRAY[$$infrastructuretransparency.org$$], 'ngo'),
  ($$Open Government Partnership$$, ARRAY[$$OGP$$], ARRAY[$$opengovpartnership.org$$], 'ngo'),
  ($$EITI$$, ARRAY[$$Extractive Industries Transparency Initiative$$], ARRAY[$$eiti.org$$], 'ngo'),
  ($$Amref Health Africa$$, ARRAY[$$Amref$$], ARRAY[$$amref.org$$], 'ngo'),
  ($$Clinton Health Access Initiative$$, ARRAY[$$CHAI$$], ARRAY[$$clintonhealthaccess.org$$], 'ngo'),
  ($$Nutrition International$$, '{}'::text[], ARRAY[$$nutritionintl.org$$], 'ngo'),
  ($$GAIN$$, ARRAY[$$Global Alliance for Improved Nutrition$$], ARRAY[$$gainhealth.org$$], 'ngo'),
  ($$Alive & Thrive$$, '{}'::text[], ARRAY[$$aliveandthrive.org$$], 'ngo'),
  ($$TechnoServe$$, '{}'::text[], ARRAY[$$technoserve.org$$], 'ngo'),
  ($$One Acre Fund$$, '{}'::text[], ARRAY[$$oneacrefund.org$$], 'ngo'),
  ($$Aga Khan Development Network$$, ARRAY[$$AKDN$$, $$Aga Khan Foundation$$], ARRAY[$$akdn.org$$], 'ngo'),
  ($$The Asia Foundation$$, ARRAY[$$Asia Foundation$$], ARRAY[$$asiafoundation.org$$], 'ngo'),
  ($$WWF$$, ARRAY[$$World Wide Fund for Nature$$, $$World Wildlife Fund$$], ARRAY[$$panda.org$$, $$worldwildlife.org$$], 'ngo'),
  ($$Conservation International$$, '{}'::text[], ARRAY[$$conservation.org$$], 'ngo'),
  ($$The Nature Conservancy$$, ARRAY[$$TNC$$, $$Nature Conservancy$$], ARRAY[$$nature.org$$], 'ngo'),
  ($$IUCN$$, ARRAY[$$International Union for Conservation of Nature$$], ARRAY[$$iucn.org$$], 'ngo'),
  ($$REACH Initiative$$, ARRAY[$$REACH$$, $$IMPACT Initiatives$$], ARRAY[$$reach-initiative.org$$, $$impact-initiatives.org$$], 'ngo'),
  ($$Financial Sector Deepening Tanzania$$, ARRAY[$$FSDT$$, $$FSD Tanzania$$], ARRAY[$$fsdt.or.tz$$], 'ngo'),
  -- Research institutes and universities
  ($$J-PAL$$, ARRAY[$$Abdul Latif Jameel Poverty Action Lab$$], ARRAY[$$povertyactionlab.org$$], 'academic'),
  ($$IFPRI$$, ARRAY[$$International Food Policy Research Institute$$], ARRAY[$$ifpri.org$$], 'academic'),
  ($$ODI$$, ARRAY[$$Overseas Development Institute$$, $$ODI Global$$], ARRAY[$$odi.org$$], 'academic'),
  ($$Institute of Development Studies$$, ARRAY[$$IDS$$], ARRAY[$$ids.ac.uk$$], 'academic'),
  ($$Center for Global Development$$, ARRAY[$$CGD$$], ARRAY[$$cgdev.org$$], 'academic'),
  ($$World Resources Institute$$, ARRAY[$$WRI$$], ARRAY[$$wri.org$$], 'academic'),
  ($$IIED$$, ARRAY[$$International Institute for Environment and Development$$], ARRAY[$$iied.org$$], 'academic'),
  ($$Stockholm Environment Institute$$, ARRAY[$$SEI$$], ARRAY[$$sei.org$$], 'academic'),
  ($$icddr,b$$, ARRAY[$$International Centre for Diarrhoeal Disease Research, Bangladesh$$], ARRAY[$$icddrb.org$$], 'academic'),
  ($$African Population and Health Research Center$$, ARRAY[$$APHRC$$, $$Africa Population and Health Research Center$$], ARRAY[$$aphrc.org$$], 'academic'),
  ($$Grupo de Análisis para el Desarrollo$$, ARRAY[$$GRADE$$], ARRAY[$$grade.org.pe$$], 'academic'),
  ($$Harvard University$$, ARRAY[$$Harvard$$, $$Harvard Kennedy School$$], ARRAY[$$harvard.edu$$], 'academic'),
  ($$London School of Economics$$, ARRAY[$$LSE$$, $$London School of Economics and Political Science$$], ARRAY[$$lse.ac.uk$$], 'academic'),
  ($$London School of Hygiene & Tropical Medicine$$, ARRAY[$$LSHTM$$], ARRAY[$$lshtm.ac.uk$$], 'academic'),
  ($$University of Oxford$$, ARRAY[$$Oxford University$$], ARRAY[$$ox.ac.uk$$], 'academic'),
  ($$Johns Hopkins University$$, ARRAY[$$Johns Hopkins$$, $$Johns Hopkins Bloomberg School of Public Health$$], ARRAY[$$jhu.edu$$, $$jhsph.edu$$], 'academic'),
  ($$Boston University$$, '{}'::text[], ARRAY[$$bu.edu$$], 'academic'),
  ($$Australian National University$$, ARRAY[$$ANU$$], ARRAY[$$anu.edu.au$$], 'academic'),
  ($$University of Cape Town$$, ARRAY[$$UCT$$], ARRAY[$$uct.ac.za$$], 'academic'),
  ($$Addis Ababa University$$, ARRAY[$$AAU$$], ARRAY[$$aau.edu.et$$], 'academic'),
  ($$University of Cape Coast$$, ARRAY[$$UCC$$], ARRAY[$$ucc.edu.gh$$], 'academic'),
  ($$University of Rwanda$$, '{}'::text[], ARRAY[$$ur.ac.rw$$], 'academic'),
  ($$American University of Beirut$$, ARRAY[$$AUB$$], ARRAY[$$aub.edu.lb$$], 'academic'),
  ($$All India Institute of Medical Sciences$$, ARRAY[$$AIIMS$$], ARRAY[$$aiims.edu$$], 'academic'),
  ($$Universidade Federal de Pernambuco$$, ARRAY[$$UFPE$$], ARRAY[$$ufpe.br$$], 'academic'),
  -- Foundations
  ($$Bill & Melinda Gates Foundation$$, ARRAY[$$Gates Foundation$$, $$BMGF$$], ARRAY[$$gatesfoundation.org$$], 'foundation'),
  ($$Rockefeller Foundation$$, ARRAY[$$The Rockefeller Foundation$$], ARRAY[$$rockefellerfoundation.org$$], 'foundation'),
  ($$Ford Foundation$$, '{}'::text[], ARRAY[$$fordfoundation.org$$], 'foundation'),
  ($$William and Flora Hewlett Foundation$$, ARRAY[$$Hewlett Foundation$$], ARRAY[$$hewlett.org$$], 'foundation'),
  ($$MacArthur Foundation$$, '{}'::text[], ARRAY[$$macfound.org$$], 'foundation'),
  ($$Open Society Foundations$$, ARRAY[$$OSF$$], ARRAY[$$opensocietyfoundations.org$$], 'foundation'),
  ($$Wellcome$$, ARRAY[$$Wellcome Trust$$], ARRAY[$$wellcome.org$$], 'foundation'),
  ($$Mastercard Foundation$$, '{}'::text[], ARRAY[$$mastercardfdn.org$$], 'foundation'),
  ($$Children's Investment Fund Foundation$$, ARRAY[$$CIFF$$], ARRAY[$$ciff.org$$], 'foundation'),
  ($$David and Lucile Packard Foundation$$, ARRAY[$$Packard Foundation$$], ARRAY[$$packard.org$$], 'foundation'),
  ($$Bloomberg Philanthropies$$, '{}'::text[], ARRAY[$$bloomberg.org$$], 'foundation'),
  -- Consulting firms and other private companies
  ($$Palladium$$, ARRAY[$$Palladium Group$$], ARRAY[$$thepalladiumgroup.com$$], 'private_firm'),
  ($$DAI$$, ARRAY[$$DAI Global$$, $$Development Alternatives Inc$$], ARRAY[$$dai.com$$], 'private_firm'),
  ($$Chemonics$$, ARRAY[$$Chemonics International$$], ARRAY[$$chemonics.com$$], 'private_firm'),
  ($$Abt Global$$, ARRAY[$$Abt Associates$$], ARRAY[$$abtglobal.com$$, $$abtassociates.com$$], 'private_firm'),
  ($$Tetra Tech$$, '{}'::text[], ARRAY[$$tetratech.com$$], 'private_firm'),
  ($$AECOM$$, '{}'::text[], ARRAY[$$aecom.com$$], 'private_firm'),
  ($$Deloitte$$, '{}'::text[], ARRAY[$$deloitte.com$$], 'private_firm'),
  ($$PwC$$, ARRAY[$$PricewaterhouseCoopers$$], ARRAY[$$pwc.com$$], 'private_firm'),
  ($$KPMG$$, '{}'::text[], ARRAY[$$kpmg.com$$], 'private_firm'),
  ($$EY$$, ARRAY[$$Ernst & Young$$], ARRAY[$$ey.com$$], 'private_firm'),
  ($$McKinsey & Company$$, ARRAY[$$McKinsey$$], ARRAY[$$mckinsey.com$$], 'private_firm'),
  ($$Boston Consulting Group$$, ARRAY[$$BCG$$], ARRAY[$$bcg.com$$], 'private_firm'),
  ($$Dalberg$$, ARRAY[$$Dalberg Advisors$$], ARRAY[$$dalberg.com$$], 'private_firm'),
  ($$Oxford Policy Management$$, ARRAY[$$OPM$$], ARRAY[$$opml.co.uk$$], 'private_firm'),
  ($$Adam Smith International$$, '{}'::text[], ARRAY[$$adamsmithinternational.com$$], 'private_firm'),
  ($$Mott MacDonald$$, '{}'::text[], ARRAY[$$mottmac.com$$], 'private_firm'),
  ($$Crown Agents$$, '{}'::text[], ARRAY[$$crownagents.com$$], 'private_firm'),
  ($$DT Global$$, ARRAY[$$Cardno International Development$$], ARRAY[$$dt-global.com$$], 'private_firm'),
  ($$IMC Worldwide$$, '{}'::text[], ARRAY[$$imcworldwide.com$$], 'private_firm'),
  ($$Itad$$, '{}'::text[], ARRAY[$$itad.com$$], 'private_firm'),
  ($$NORC at the University of Chicago$$, ARRAY[$$NORC$$], ARRAY[$$norc.org$$], 'private_firm'),
  ($$RTI International$$, ARRAY[$$RTI$$], ARRAY[$$rti.org$$], 'private_firm'),
  ($$ICF$$, ARRAY[$$ICF International$$], ARRAY[$$icf.com$$], 'private_firm'),
  ($$Ecorys$$, '{}'::text[], ARRAY[$$ecorys.com$$], 'private_firm'),
  ($$WSP$$, ARRAY[$$Louis Berger$$], ARRAY[$$wsp.com$$], 'private_firm'),
  ($$Atkins$$, ARRAY[$$Atkins Global$$, $$AtkinsRéalis$$], ARRAY[$$atkinsglobal.com$$, $$atkinsrealis.com$$], 'private_firm'),
  ($$Management Systems International$$, ARRAY[$$MSI$$], ARRAY[$$msiworldwide.com$$], 'private_firm'),
  ($$MicroSave Consulting$$, ARRAY[$$MSC$$, $$MicroSave$$], ARRAY[$$microsave.net$$], 'private_firm'),
  ($$Thoughtworks$$, ARRAY[$$ThoughtWorks$$], ARRAY[$$thoughtworks.com$$], 'private_firm'),
  -- Government bodies that recur across the data
  ($$Ethiopian Public Health Institute$$, ARRAY[$$EPHI$$], ARRAY[$$ephi.gov.et$$], 'government'),
  ($$Ghana Education Service$$, ARRAY[$$GES$$], '{}'::text[], 'government'),
  ($$Bangko Sentral ng Pilipinas$$, ARRAY[$$BSP$$, $$Central Bank of the Philippines$$], ARRAY[$$bsp.gov.ph$$], 'government'),
  ($$State Bank of Pakistan$$, ARRAY[$$SBP$$], ARRAY[$$sbp.org.pk$$], 'government'),
  ($$National Treasury of South Africa$$, ARRAY[$$National Treasury, South Africa$$], ARRAY[$$treasury.gov.za$$], 'government')
ON CONFLICT (name) DO NOTHING;
