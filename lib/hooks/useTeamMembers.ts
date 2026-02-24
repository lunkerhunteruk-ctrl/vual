import { useState, useEffect, useCallback } from 'react';

type MemberStatus = 'active' | 'invited' | 'inactive';

interface TeamMember {
  id: string;
  user_id?: string;
  email: string;
  name: string;
  role_id?: string;
  role_name?: string;
  status: MemberStatus;
  invited_at?: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

interface UseTeamMembersOptions {
  status?: MemberStatus;
}

interface UseTeamMembersReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  inviteMember: (data: { email: string; name: string; role_id?: string; role_name?: string }) => Promise<string>;
  updateMember: (id: string, data: Partial<TeamMember>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  activateMember: (id: string, userId: string) => Promise<void>;
  deactivateMember: (id: string) => Promise<void>;
}

export function useTeamMembers(options: UseTeamMembersOptions = {}): UseTeamMembersReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (options.status) {
        params.set('status', options.status);
      }

      const response = await fetch(`/api/team?${params.toString()}`);
      const data = await response.json();

      if (data.members) {
        setMembers(data.members);
      } else {
        setMembers([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team members'));
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const refresh = async () => {
    await fetchMembers();
  };

  const inviteMember = async (data: { email: string; name: string; role_id?: string; role_name?: string }): Promise<string> => {
    const response = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to invite member');
    }

    const result = await response.json();
    await refresh();
    return result.id;
  };

  const updateMember = async (id: string, data: Partial<TeamMember>): Promise<void> => {
    const response = await fetch('/api/team', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      throw new Error('Failed to update member');
    }

    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...data } : member
      )
    );
  };

  const removeMember = async (id: string): Promise<void> => {
    const response = await fetch(`/api/team?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove member');
    }

    setMembers((prev) => prev.filter((member) => member.id !== id));
  };

  const activateMember = async (id: string, userId: string): Promise<void> => {
    await updateMember(id, {
      user_id: userId,
      status: 'active',
      last_active_at: new Date().toISOString(),
    });
  };

  const deactivateMember = async (id: string): Promise<void> => {
    await updateMember(id, { status: 'inactive' });
  };

  return { members, isLoading, error, refresh, inviteMember, updateMember, removeMember, activateMember, deactivateMember };
}

export function useTeamMember(memberId: string | null) {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }

    const fetchMember = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/team?id=${memberId}`);
        const data = await response.json();

        if (data && data.id) {
          setMember(data);
        } else {
          setMember(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch team member'));
        setMember(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMember();
  }, [memberId]);

  return { member, isLoading, error };
}
