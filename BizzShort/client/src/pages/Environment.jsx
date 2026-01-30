import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Environment() {
    return (
        <CategoryPageLayout
            category="environment"
            title="Environment"
            subtitle="Green Planet"
            description="Environmental news, climate change updates, sustainability initiatives, and conservation efforts"
            accentColor="#10b981"
            heroImage="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80"
            iconClass="fa-solid fa-leaf"
        />
    );
}
