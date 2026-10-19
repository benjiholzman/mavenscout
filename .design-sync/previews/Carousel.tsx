import { Carousel } from 'mavenscout'

export function MultipleImages() {
  return (
    <div className="w-[360px]">
      <Carousel
        images={[
          { url: 'https://picsum.photos/seed/amara-portfolio-1-img1/900/600', caption: 'Baseline enumeration in Ashanti region' },
          { url: 'https://picsum.photos/seed/amara-portfolio-1-img2/900/600', caption: 'Indicator framework workshop with program staff' },
          { url: 'https://picsum.photos/seed/rohan-portfolio-1-img1/900/600', caption: 'Salinity monitoring, coastal Bangladesh' },
        ]}
      />
    </div>
  )
}

export function SingleImage() {
  return (
    <div className="w-[360px]">
      <Carousel images={[{ url: 'https://picsum.photos/seed/ifeoma-portfolio-1-img1/900/600', caption: 'Smallholder rice cooperative, Nigeria' }]} />
    </div>
  )
}
