import { TagPills } from 'mavenscout'

export function CoreAndStrong() {
  return (
    <TagPills
      tags={[
        { name: 'Gender Mainstreaming', tier: 'core' },
        { name: 'Gender-Based Violence', tier: 'core' },
        { name: 'Monitoring & Evaluation', tier: 'core' },
        { name: 'Qualitative Research', tier: 'strong' },
        { name: 'Survey Design', tier: 'strong' },
        { name: 'Statistical Analysis', tier: 'strong' },
      ]}
    />
  )
}

export function WithWorkingKnowledge() {
  return (
    <TagPills
      showWorking
      tags={[
        { name: 'Nutrition', tier: 'core' },
        { name: 'Impact Evaluation', tier: 'core' },
        { name: 'Survey Design', tier: 'strong' },
        { name: 'Public Financial Management', tier: 'working' },
        { name: 'Data Visualization', tier: 'working' },
      ]}
    />
  )
}

export function CoreOnly() {
  return <TagPills tags={[{ name: 'WASH', tier: 'core' }]} />
}
