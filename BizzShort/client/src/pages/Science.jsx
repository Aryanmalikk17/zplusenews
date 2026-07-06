import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Science() {
    return (
        <CategoryPageLayout
            category="science"
            title="Science"
            subtitle="Discoveries & Innovations"
            description="Latest scientific breakthroughs, research updates, and discoveries"
            accentColor="#0284c7"
            heroImage="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&q=80"
            iconClass="fa-solid fa-flask"
        />
    );
}
