import useSWR, { mutate } from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const useAppointments = () => {
  const { data, error, isLoading } = useSWR('/api/appointments', fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });
  return {
    appointments: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutateAppointments: () => mutate('/api/appointments'),
  };
};

export const useTesters = () => {
  const { data, error, isLoading } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  return {
    testers: Array.isArray(data) ? data.filter((u: any) => u.role === 'ساحب منزلي' && u.status === 'نشط') : [],
    isLoading,
    isError: error,
  };
};

export const useExaminations = () => {
  const { data, error, isLoading } = useSWR('/api/examinations', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  return {
    examinations: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
  };
};

export const useCallLogs = (date: string) => {
  const missedKey = `/api/calls/missed?date=${date}`;
  const answeredKey = `/api/calls/answered?date=${date}`;
  const outboundKey = `/api/calls/outbound?date=${date}`;
  const calledListKey = `/api/calls/called-list?date=${date}`;

  const { data: missed } = useSWR(missedKey, fetcher);
  const { data: answered } = useSWR(answeredKey, fetcher);
  const { data: outbound } = useSWR(outboundKey, fetcher);
  const { data: calledList } = useSWR(calledListKey, fetcher);

  return {
    missed: Array.isArray(missed) ? missed : [],
    answered: Array.isArray(answered) ? answered : [],
    outbound: Array.isArray(outbound) ? outbound : [],
    calledList: Array.isArray(calledList) ? calledList : [],
    isLoading: !missed || !answered || !outbound || !calledList,
    mutateAll: () => {
      mutate(missedKey);
      mutate(answeredKey);
      mutate(outboundKey);
      mutate(calledListKey);
    }
  };
};

export const useCliqStats = (queryString: string = '') => {
  const url = `/api/cliq/stats${queryString ? `?${queryString}` : ''}`;
  const { data, error, isLoading, mutate: mutateStats } = useSWR(url, fetcher, {
    refreshInterval: 2500, // Live auto-refresh every 2.5s
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 1000
  });
  return {
    stats: (data && typeof data === 'object' && !data.error) ? data : {
      totalTransfers: 0,
      unclosedCount: 0,
      infoProvidedCount: 0,
      closedCount: 0,
      totalAmount: 0,
      closedAmount: 0
    },
    isLoading,
    isError: error,
    mutateStats
  };
};

export const useCliqBranches = (onlyActive: boolean = false) => {
  const url = `/api/cliq/branches${onlyActive ? '?status=active' : ''}`;
  const { data, error, isLoading, mutate: mutateBranches } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 2000
  });

  return {
    branches: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutateBranches
  };
};

export const useCliqTransactions = (queryString: string = '') => {
  const url = `/api/cliq/transactions${queryString ? `?${queryString}` : ''}`;
  const { data, error, isLoading, mutate: mutateTransactions } = useSWR(url, fetcher, {
    refreshInterval: 2500, // Live auto-refresh every 2.5s
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 1000
  });

  return {
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    isError: error,
    mutateTransactions
  };
};

export const useCliqDevices = () => {
  const { data, error, isLoading, mutate: mutateDevices } = useSWR('/api/cliq/devices/status', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true
  });

  return {
    devices: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutateDevices
  };
};

