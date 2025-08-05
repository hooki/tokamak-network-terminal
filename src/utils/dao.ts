import { readContract, readContracts, getPublicClient, http } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { wagmiConfig } from './wagmi-config.js';
import { getNetworkAddresses } from '../constants.js';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';
import { operatorManagerAbi } from '../abis/operatorManager.js';
import { layer2ManagerAbi } from '../abis/layer2Manager.js';
import { daoCandidateAbi } from '../abis/daoCandidate.js';
import { seigManagerAbi } from '../abis/seigManager.js';

/**
 * DAO Committee 관련 유틸리티 함수들
 */

export interface CandidateInfo {
  candidateContract: string;
  indexMembers: bigint;
  memberJoinedTime: bigint;
  rewardPeriod: bigint;
  claimedTimestamp: bigint;
}

export interface DAOMemberCandidateInfo {
  candidate: string;  // 멤버주소 (EOA or OperatorManager)
  candidateInfo?: CandidateInfo | null;
  operatorManager?: string | null;
  manager?: string | null;
}


export interface DAOMembersStakingInfo {
  candidate: string;
  candidateInfo: CandidateInfo;
  operatorManager?: string | null;
  manager?: string;
  memo?: string;
  totalStaked?: bigint;
  lastCommitBlock?: bigint;
  lastUpdateSeigniorageTime?: bigint;
  claimableActivityReward?: bigint;
}

/**
 * 모든 DAO 멤버 목록과 상세 정보를 조회
 *
 * @param network - 네트워크 ('mainnet' | 'sepolia')
 * @returns 멤버 정보 배열
 *
 */
export async function getDAOMemberCandidateInfo(
  network: string = 'mainnet'
): Promise<DAOMemberCandidateInfo[]> {
  try {
    const networkAddresses = getNetworkAddresses(network);
    const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

    // 먼저 maxMember를 확인
    const maxMemberResult = await readContract(wagmiConfig, {
      address: networkAddresses.DAO_COMMITTEE,
      abi: daoCommitteeAbi,
      functionName: 'maxMember',
      args: [],
      chainId,
    });

    const maxMembers = Number(maxMemberResult);
    const activeMemberData: { address: string, slotIndex: number }[] = [];

    // 멀티콜로 모든 멤버 주소들을 한 번에 조회
    const contracts = Array.from({ length: maxMembers }, (_, i) => ({
      address: networkAddresses.DAO_COMMITTEE,
      abi: daoCommitteeAbi,
      functionName: 'members',
      args: [i],
      chainId,
    }));

    const results = await readContracts(wagmiConfig, { contracts });

    // 결과에서 유효한 멤버 주소만 추출
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.error && result.result && result.result !== '0x0000000000000000000000000000000000000000') {
        activeMemberData.push({
          address: result.result as string,
          slotIndex: i,
        });
      }
    }
    // console.log('activeMemberData', activeMemberData);

    // 2단계: 모든 활성 멤버의 candidateInfo를 한 번에 가져오기
    const candidateInfoContracts = activeMemberData.map(member => ({
      address: networkAddresses.DAO_COMMITTEE,
      abi: daoCommitteeAbi,
      functionName: 'candidateInfos',
      args: [member.address as `0x${string}`],
      chainId,
    }));

    const candidateInfoResults = await readContracts(wagmiConfig, { contracts: candidateInfoContracts });

    // console.log('candidateInfoResults', candidateInfoResults);

    // activeMemberData와 candidateInfoResults를 매핑해서 원하는 형태로 변환
    const memberInfoList = activeMemberData.map((member, index) => {
      const candidateInfoResult = candidateInfoResults[index];
      return {
        candidate: member.address,
        candidateInfo: candidateInfoResult.error ? null : candidateInfoResult.result as unknown as CandidateInfo,
      };
    });

    return memberInfoList;

  } catch (error) {
    console.error(`Failed to get DAO members on ${network}:`, error);
    return [];
  }
}

/** 모든 멤버의 오퍼레이터 매니저 주소와 매니저 주소 조회 */
export async function getDAOMemberOperatorManagerInfo(
  network: string = 'mainnet'
): Promise<DAOMemberCandidateInfo[]> {
  try {
    const networkAddresses = getNetworkAddresses(network);
    const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
    const members = await getDAOMemberCandidateInfo(network);


    // 멤버 정보중에서는 candidateInfo.candidateContract 가 있는 것만 오퍼레이터주소를 찾을 수 있다.
    // 오퍼레이터주소는 null일수도 있고 주소일수도 있다. 주소인경우, manager() 확인해서, manager 주소를 찾을 수 있다.
    // 리턴할때는 DAOMemberOperatorManagerInfo 형식으로 받은 members 에 operatorManager 주소를 넣어서 리턴한다.
    const memberInfoList: DAOMemberCandidateInfo[] = [];
    const validMembers: DAOMemberCandidateInfo[] = [];

    for (const member of members) {
      const memberInfo = {
        candidate: member.candidate,
        candidateInfo: member.candidateInfo as CandidateInfo,
        operatorManager: null,
        manager: null,
      };
      memberInfoList.push(memberInfo);
      validMembers.push(memberInfo);
    }

    // 3단계: 유효한 멤버의 operatorManager를 한 번에 가져오기
    const operatorManagerContracts = validMembers.map(member => ({
      address: networkAddresses.LAYER2_MANAGER as `0x${string}`,
      abi: layer2ManagerAbi as any,
      functionName: 'operatorOfLayer',
      args: [member.candidateInfo?.candidateContract as `0x${string}`],
      chainId,
    }));

    const operatorManagerResults = await readContracts(wagmiConfig, { contracts: operatorManagerContracts });

    // 4단계: 모든 활성 멤버의 manager를 한 번에 가져오기
    // operatorManagerResults를 확인해서, 가져오면 manager에 넣고 아니면 manager는 null이다.
    const validOperatorManagerResults = operatorManagerResults
      .map((result, index) => ({
        result: result.result as string,
        originalIndex: index
      }))
      .filter(item => !operatorManagerResults[item.originalIndex].error &&
                      item.result &&
                      item.result !== '0x0000000000000000000000000000000000000000');

    const managerContracts = validOperatorManagerResults.map(item => ({
      address: item.result as `0x${string}`,
      abi: operatorManagerAbi as any,
      functionName: 'manager',
      args: [],
      chainId,
    }));

    const managerResults = await readContracts(wagmiConfig, { contracts: managerContracts });

    // 결과를 정확히 매칭
    for (let i = 0; i < memberInfoList.length; i++) {
      const member = memberInfoList[i];
      const operatorManagerResult = operatorManagerResults[i];

      if (!operatorManagerResult.error && operatorManagerResult.result &&
          operatorManagerResult.result !== '0x0000000000000000000000000000000000000000') {
        const operatorManager = String(operatorManagerResult.result);
        member.operatorManager = operatorManager;

        // validOperatorManagerResults에서 해당 operatorManager 찾기
        const validIndex = validOperatorManagerResults.findIndex(item => item.result === operatorManager);
        if (validIndex !== -1 && validIndex < managerResults.length) {
          const managerResult = managerResults[validIndex];
          if (!managerResult.error && managerResult.result) {
            member.manager = String(managerResult.result);
          }
        }
      }
    }

    return memberInfoList;

  } catch (error) {
    console.error(`Failed to get DAO member operator manager info on ${network}:`, error);
    return [];
  }
}

/**
 * DAO 멤버 수를 조회
 */
export async function getDAOMemberCount(network: string = 'mainnet'): Promise<number> {
  try {
    const networkAddresses = getNetworkAddresses(network);
    const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

    const result = await readContract(wagmiConfig, {
      address: networkAddresses.DAO_COMMITTEE,
      abi: daoCommitteeAbi,
      functionName: 'maxMember',
      args: [],
      chainId,
    });

    return Number(result);
  } catch (error) {
    console.error(`Failed to get DAO member count on ${network}:`, error);
    return 0;
  }
}


/**
 * 특정 주소가 DAO 멤버인지 확인
 */
export async function checkDAOMembership(
  address: string,
  network: string = 'mainnet'
): Promise<boolean> {
  try {
    // getDAOMembers 함수를 호출해서, 멤버 리스트의 candidate나 manager 중에 있는지 확인
    const members = await getDAOMemberOperatorManagerInfo(network);
    const normalizedAddress = address.toLowerCase();
    const member = members.find(member =>
      member.candidate.toLowerCase() === normalizedAddress ||
      (member.manager && member.manager.toLowerCase() === normalizedAddress)
    );
    if (member) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Failed to check DAO membership for ${address} on ${network}:`, error);
    return false;
  }
}


/**
   * 모든 커미티 멤버의 스테이킹 정보와 최근 시뇨리지 업데이트 시간 조회 , 오퍼레이터 주소를 가져올것인지는 옵션
   */
export async function getDAOMembersStakingInfo(
  network: string = 'mainnet',
  includeOperatorManager: boolean = false
): Promise<DAOMembersStakingInfo[]> {
  try {
    const networkAddresses = getNetworkAddresses(network);
    const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
    let members ;
    if(includeOperatorManager){
      members = await getDAOMemberOperatorManagerInfo(network);
    } else {
      members = await getDAOMemberCandidateInfo(network);
    }

    const stakingInfo: DAOMembersStakingInfo[] = [];

    // 멀티콜로 스테이킹 정보 조회
    const stakingContracts = members.map(member => {
      const candidateContract = member.candidateInfo?.candidateContract;
      return [
        {
          address: candidateContract as `0x${string}`,
          abi: daoCandidateAbi as any,
          functionName: 'memo',
          args: [],
          chainId,
        },
        {
          address: candidateContract as `0x${string}`,
          abi: daoCandidateAbi as any,
          functionName: 'totalStaked',
          args: [],
          chainId,
        },
        {
          address: networkAddresses.DAO_COMMITTEE,
          abi: daoCommitteeAbi as any,
          functionName: 'getClaimableActivityReward',
          args: [member.candidate as `0x${string}`],
          chainId,
        },
        {
          address: networkAddresses.SEIG_MANAGER,
          abi: seigManagerAbi as any,
          functionName: 'lastCommitBlock',
          args: [candidateContract as `0x${string}`],
          chainId,
        }
      ];
    }).flat();

    const stakingResults = await readContracts(wagmiConfig, { contracts: stakingContracts });
    const publicClient = getPublicClient(wagmiConfig, { chainId });
    // 결과를 4개씩 그룹화하여 처리
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const resultIndex = i * 4;
      const [memoResult, totalStakedResult, claimableRewardResult, lastCommitBlockResult] = stakingResults.slice(resultIndex, resultIndex + 4);

      // lastCommitBlock의 타임스탬프 가져오기 (개별 처리)
      let lastUpdateSeigniorageTime = 0n;
      if (!lastCommitBlockResult.error && lastCommitBlockResult.result && (lastCommitBlockResult.result as bigint) > 0n) {
        try {
          const lastCommitBlock = lastCommitBlockResult.result as bigint;
          const block = await publicClient.getBlock({
            blockNumber: lastCommitBlock
          });
          lastUpdateSeigniorageTime = BigInt(block.timestamp);
        } catch (error) {
          console.warn(`Failed to get block timestamp:`, error);
        }
      }

      stakingInfo.push({
        candidate: member.candidate,
        candidateInfo: member.candidateInfo as CandidateInfo,
        memo: memoResult.error ? '' : String(memoResult.result),
        totalStaked: totalStakedResult.error ? 0n : (totalStakedResult.result as bigint),
        lastCommitBlock: lastCommitBlockResult.error ? 0n : (lastCommitBlockResult.result as bigint),
        lastUpdateSeigniorageTime: lastUpdateSeigniorageTime,
        claimableActivityReward: claimableRewardResult.error ? 0n : (claimableRewardResult.result as bigint),
      });
    }
    return stakingInfo;
  } catch (error) {
    console.error(`Failed to get DAO members staking info on ${network}:`, error);
    return [];
  }
}