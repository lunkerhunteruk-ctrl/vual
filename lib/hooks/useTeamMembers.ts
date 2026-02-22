import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { TeamMember } from '@/lib/types';

type MemberStatus = 'active' | 'invited' | 'inactive';

interface UseTeamMembersOptions {
  shopId?: string;
  status?: MemberStatus;
}

interface UseTeamMembersReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  inviteMember: (data: { email: string; name: string; roleId: string; roleName: string; shopId: string }) => Promise<string>;
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
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.TEAM_MEMBERS),
        orderBy('createdAt', 'desc')
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      const snapshot = await getDocs(q);
      const fetchedMembers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        invitedAt: doc.data().invitedAt?.toDate(),
        lastActiveAt: doc.data().lastActiveAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as TeamMember[];

      setMembers(fetchedMembers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team members'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.status]);

  useEffect(() => {
    fetchMembers();
  }, [options.shopId, options.status]);

  const refresh = async () => {
    await fetchMembers();
  };

  const inviteMember = async (data: { email: string; name: string; roleId: string; roleName: string; shopId: string }): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTIONS.TEAM_MEMBERS), {
      ...data,
      userId: '', // Will be set when user accepts invitation
      status: 'invited',
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await refresh();
    return docRef.id;
  };

  const updateMember = async (id: string, data: Partial<TeamMember>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.TEAM_MEMBERS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...data, updatedAt: new Date() } : member
      )
    );
  };

  const removeMember = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await deleteDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id));
    setMembers((prev) => prev.filter((member) => member.id !== id));
  };

  const activateMember = async (id: string, userId: string): Promise<void> => {
    await updateMember(id, {
      userId,
      status: 'active',
      lastActiveAt: new Date(),
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
    if (!memberId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchMember = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.TEAM_MEMBERS, memberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setMember({
            id: docSnap.id,
            ...data,
            invitedAt: data.invitedAt?.toDate(),
            lastActiveAt: data.lastActiveAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as TeamMember);
        } else {
          setMember(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch team member'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMember();
  }, [memberId]);

  return { member, isLoading, error };
}
