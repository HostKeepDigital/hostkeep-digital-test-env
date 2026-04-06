export function createPageUrl(pageName: string | undefined | null) {
    if (!pageName) return '/';
    return '/' + pageName.replace(/ /g, '-');
}