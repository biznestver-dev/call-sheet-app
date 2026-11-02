import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isPartiallyConfigured = Boolean(supabaseUrl || supabaseAnonKey) && !isConfigured;

let supabaseClient;
let writeQueue = Promise.resolve();
const clientId = crypto.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function getSharedStoreMode() {
    if (isConfigured) return 'shared';
    return isPartiallyConfigured ? 'incomplete' : 'local';
}

export async function connectSharedStore(initialData, onRemoteUpdate, onStatusChange) {
    if (!isConfigured) {
        throw new Error('Для общего хранилища нужны VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    onStatusChange('connecting');

    let subscriptionReady;
    const subscription = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Не удалось подключиться к каналу синхронизации.')), 10000);
        subscriptionReady = status => {
            clearTimeout(timeout);
            if (status === 'SUBSCRIBED') resolve();
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                reject(new Error(`Канал синхронизации: ${status}`));
            }
        };
    });

    supabaseClient
        .channel('call-sheet-shared-document')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'call_sheet_documents',
            filter: 'id=eq.shared'
        }, payload => {
            if (payload.new?.data && payload.new.client_id !== clientId) {
                onRemoteUpdate(payload.new.data);
            }
        })
        .subscribe(status => {
            if (status === 'SUBSCRIBED') onStatusChange('connected');
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                onStatusChange('offline');
            }
            subscriptionReady(status);
        });

    await subscription;

    const { data: existing, error: readError } = await supabaseClient
        .from('call_sheet_documents')
        .select('data')
        .eq('id', 'shared')
        .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing.data;

    const { data: created, error: insertError } = await supabaseClient
        .from('call_sheet_documents')
        .insert({ id: 'shared', data: initialData, client_id: clientId })
        .select('data')
        .single();

    if (!insertError) return created.data;
    if (insertError.code !== '23505') throw insertError;

    const { data: concurrentDocument, error: concurrentReadError } = await supabaseClient
        .from('call_sheet_documents')
        .select('data')
        .eq('id', 'shared')
        .single();

    if (concurrentReadError) throw concurrentReadError;
    return concurrentDocument.data;
}

export function saveSharedData(data) {
    if (!supabaseClient) {
        return Promise.reject(new Error('Общее хранилище не подключено.'));
    }

    const write = writeQueue.then(async () => {
        const { error } = await supabaseClient
            .from('call_sheet_documents')
            .upsert({ id: 'shared', data, client_id: clientId, updated_at: new Date().toISOString() });
        if (error) throw error;
    });
    writeQueue = write.catch(() => {});
    return write;
}
