import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Others() {
    return (
        <CategoryPageLayout
            category="others"
            title="Other Topics"
            subtitle="More Updates"
            description="Miscellaneous news, special interest stories, and general updates"
            accentColor="#4b5563"
            heroImage="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1600&q=80"
            iconClass="fa-solid fa-ellipsis"
        />
    );
}
