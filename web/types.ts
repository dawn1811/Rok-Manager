
export enum Role {
  RALLY = 'Rally',
  GARRISON = 'Garrison',
  FIELD = 'Field',
}

export enum AooTeam {
  NONE = 'None',
  TEAM_1 = 'Team 1',
  TEAM_2 = 'Team 2',
}

export interface User {
  governorId: string;
  role: Role;
  aooTeam: AooTeam;
}

export interface PlayerStat {
  governorId: string;
  name: string;
  power: number;
  kills: number;
  deaths: number;
  t5Kills: number;
  dkp: number;
}

export interface GameEvent {
  id: string;
  title: string;
  date: string;
  description: string;
}

export type StatsData = {
  [kvkName: string]: PlayerStat[];
};

export type View = 'LOGIN' | 'DASHBOARD' | 'PROFILE' | 'EVENTS';