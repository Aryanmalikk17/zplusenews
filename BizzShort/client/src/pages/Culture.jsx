import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Culture() {
    return (
        <CategoryPageLayout
            category="culture"
            title="Culture"
            subtitle="Heritage & Arts"
            description="Art, history, traditions, cinema, literature, and cultural events"
            accentColor="#ec4899"
            heroImage="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1600&q=80"
            iconClass="fa-solid fa-masks-theater"
        />
    );
}
