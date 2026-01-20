-- =============================================
-- Research Platform - Demo Data
-- =============================================

-- Insert demo posts
DO $$
DECLARE
  climate_cat_id uuid;
  field_cat_id uuid;
  policy_cat_id uuid;
  researcher_id uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Get category IDs
  SELECT id INTO climate_cat_id FROM categories WHERE slug = 'climate-research' LIMIT 1;
  SELECT id INTO field_cat_id FROM categories WHERE slug = 'field-studies' LIMIT 1;
  SELECT id INTO policy_cat_id FROM categories WHERE slug = 'policy-analysis' LIMIT 1;

  -- Insert demo posts
  INSERT INTO posts (title, slug, content, excerpt, type, status, author_id, category_id, featured_image_url, published_at, view_count) VALUES
  (
    'Impact of Climate Change on Coastal Ecosystems',
    'impact-climate-change-coastal-ecosystems',
    E'Climate change continues to have profound effects on coastal ecosystems worldwide. Our recent study examined multiple coastal regions over a five-year period.\n\nKey findings include significant changes in water temperature, sea level rise affecting habitat zones, and shifts in species distribution patterns. The data suggests accelerating trends that require immediate attention.\n\nMethodology involved satellite imagery analysis, field measurements, and biodiversity surveys. We documented a 15% decline in certain coral species and observed migration patterns of marine life moving toward cooler waters.\n\nThese findings have important implications for coastal management and conservation strategies. Policymakers must consider adaptive measures to protect vulnerable ecosystems.',
    'A comprehensive five-year study examining the effects of climate change on coastal marine ecosystems and biodiversity.',
    'research',
    'published',
    researcher_id,
    climate_cat_id,
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    now() - interval '2 days',
    234
  ),
  (
    'Field Study: Amazon Rainforest Biodiversity Assessment',
    'amazon-rainforest-biodiversity-assessment',
    E'Our team spent three months conducting a comprehensive biodiversity assessment in the Amazon rainforest. This field study focused on understanding the current state of species diversity and ecosystem health.\n\nWe documented over 500 species of plants, 150 bird species, and numerous mammals and insects. The findings reveal both encouraging signs of resilience and concerning indicators of stress.\n\nSampling methods included transect surveys, camera traps, and acoustic monitoring. We established baseline data for future comparison and identified several previously undocumented species interactions.\n\nThe research highlights the critical importance of preserving these ecosystems and provides valuable data for conservation planning.',
    'Three-month field expedition documenting biodiversity and ecosystem health in the Amazon rainforest.',
    'field_study',
    'published',
    researcher_id,
    field_cat_id,
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    now() - interval '5 days',
    189
  ),
  (
    'Renewable Energy Policy: Global Perspectives',
    'renewable-energy-policy-global-perspectives',
    E'As nations worldwide commit to carbon neutrality goals, renewable energy policies have become central to climate action. This analysis examines successful policy frameworks from multiple countries.\n\nScandinavian countries lead in renewable adoption, with Denmark generating over 80% of electricity from wind power. Their success stems from long-term policy commitment and public-private partnerships.\n\nEmerging economies face unique challenges in transitioning to renewables. Financial barriers, infrastructure limitations, and energy security concerns require tailored policy approaches.\n\nKey recommendations include carbon pricing mechanisms, investment incentives, and international cooperation frameworks. Policy stability and clear long-term targets are essential for attracting investment.',
    'Analysis of renewable energy policies worldwide and recommendations for effective climate action.',
    'opinion',
    'published',
    researcher_id,
    policy_cat_id,
    'https://images.pexels.com/photos/433308/pexels-photo-433308.jpeg?auto=compress&cs=tinysrgb&w=800',
    now() - interval '1 day',
    312
  ),
  (
    'Urban Wildlife Adaptation in Growing Cities',
    'urban-wildlife-adaptation-growing-cities',
    E'As cities expand, wildlife faces unprecedented challenges in adapting to urban environments. This research examines how various species modify their behavior and habitat use in metropolitan areas.\n\nOur study tracked multiple species using GPS collars and observation stations across three major cities. Results show remarkable adaptability in some species while others struggle significantly.\n\nNocturnal behavior patterns increased by 40% in urban populations compared to rural counterparts. This shift helps animals avoid human activity during peak hours. Diet composition also changed, with urban animals showing more opportunistic feeding behaviors.\n\nUrban planning must incorporate wildlife corridors and green spaces to support biodiversity in cities.',
    'Research on how wildlife species adapt their behavior to survive in expanding urban environments.',
    'research',
    'published',
    researcher_id,
    field_cat_id,
    'https://images.pexels.com/photos/247376/pexels-photo-247376.jpeg?auto=compress&cs=tinysrgb&w=800',
    now() - interval '7 days',
    156
  ),
  (
    'Ocean Acidification: Current State and Future Projections',
    'ocean-acidification-current-future',
    E'Ocean acidification represents one of the most serious environmental challenges of our time. This study presents current measurements and models future scenarios based on various emission pathways.\n\nWe analyzed water samples from 50 locations across three ocean basins. pH levels show consistent decline, with average reduction of 0.1 units since pre-industrial times.\n\nMarine organisms with calcium carbonate shells face particular risk. Laboratory experiments demonstrate reduced calcification rates under projected future conditions. Coral reefs, shellfish, and plankton populations could face severe impacts.\n\nMitigation requires immediate reduction in CO2 emissions. Even with aggressive action, some level of acidification is unavoidable due to existing atmospheric carbon.',
    'Comprehensive analysis of ocean acidification trends and projections for marine ecosystem impacts.',
    'research',
    'published',
    researcher_id,
    climate_cat_id,
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    now() - interval '10 days',
    278
  )
  ON CONFLICT (slug) DO NOTHING;

END $$;

SELECT 'Demo data seeded successfully' as result;
