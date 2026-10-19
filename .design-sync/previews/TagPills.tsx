import { TagPills } from 'mavenscout'

export function PrimaryAndSecondary() {
  return (
    <TagPills
      tags={[
        { name: 'Gender Mainstreaming', tier: 'primary', level: 'item' },
        { name: 'Gender-Based Violence', tier: 'primary', level: 'item' },
        { name: 'Gender Budgeting', tier: 'secondary', level: 'item' },
        { name: 'Social Inclusion', tier: 'secondary', level: 'item' },
      ]}
    />
  )
}

export function WithBroadCategory() {
  return (
    <TagPills
      tags={[
        { name: 'Monitoring & Evaluation', tier: 'primary', level: 'category' },
        { name: 'Survey Design', tier: 'primary', level: 'item' },
        { name: 'Statistical Analysis', tier: 'secondary', level: 'item' },
      ]}
    />
  )
}

export function PrimaryOnly() {
  return <TagPills tags={[{ name: 'WASH', tier: 'primary', level: 'item' }]} />
}
