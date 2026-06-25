import React from 'react';
import Svg, { Ellipse, G, Rect, Text as ST } from 'react-native-svg';
import { COLORS } from '../../constants';
import { MuscleGroup } from '../../types';

export type BodyView = 'front' | 'back';

interface Props {
  selected: MuscleGroup | null;
  onSelect: (m: MuscleGroup | null) => void;
  exerciseCounts: Partial<Record<MuscleGroup, number>>;
  view: BodyView;
}

const VW = 200;
const VH = 400;

export default function BodyMapSVG({ selected, onSelect, exerciseCounts, view }: Props) {
  function visuals(m: MuscleGroup) {
    const isSelected = selected === m;
    const hasEx = (exerciseCounts[m] ?? 0) > 0;
    return {
      fill: isSelected
        ? COLORS.primary
        : hasEx
        ? '#1E3A5F'
        : COLORS.surface,
      stroke: isSelected ? '#fff' : hasEx ? COLORS.primary + '80' : COLORS.border,
      strokeWidth: isSelected ? 2 : 1,
    };
  }

  function press(m: MuscleGroup) {
    return { onPress: () => onSelect(selected === m ? null : m) };
  }

  function lc(m: MuscleGroup) {
    return selected === m ? '#fff' : (exerciseCounts[m] ?? 0) > 0 ? COLORS.primary : COLORS.textMuted;
  }

  const bg = { fill: COLORS.surface, stroke: COLORS.border, strokeWidth: 1 };

  if (view === 'front') {
    return (
      <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
        {/* ─── Non-interactive body background ─── */}
        {/* Head */}
        <Ellipse cx={100} cy={36} rx={24} ry={28} {...bg} />
        {/* Neck */}
        <Rect x={89} y={62} width={22} height={18} {...bg} />
        {/* Hip connector */}
        <Rect x={70} y={194} width={60} height={18} rx={6} {...bg} />
        {/* Forearms */}
        <Ellipse cx={25} cy={157} rx={9} ry={22} {...bg} />
        <Ellipse cx={175} cy={157} rx={9} ry={22} {...bg} />
        {/* Shins */}
        <Ellipse cx={81} cy={300} rx={14} ry={28} {...bg} />
        <Ellipse cx={119} cy={300} rx={14} ry={28} {...bg} />
        {/* Feet */}
        <Rect x={68} y={376} width={26} height={9} rx={4} {...bg} />
        <Rect x={106} y={376} width={26} height={9} rx={4} {...bg} />

        {/* ─── Muscle zones ─── */}

        {/* Shoulders */}
        <G {...press('shoulders')}>
          <Ellipse cx={57} cy={88} rx={30} ry={14} {...visuals('shoulders')} />
          <Ellipse cx={143} cy={88} rx={30} ry={14} {...visuals('shoulders')} />
          <ST x={100} y={93} textAnchor="middle" fontSize={9} fill={lc('shoulders')}>Shoulders</ST>
        </G>

        {/* Chest */}
        <G {...press('chest')}>
          <Ellipse cx={100} cy={116} rx={38} ry={22} {...visuals('chest')} />
          <ST x={100} y={120} textAnchor="middle" fontSize={10} fill={lc('chest')}>Chest</ST>
        </G>

        {/* Biceps */}
        <G {...press('biceps')}>
          <Ellipse cx={33} cy={124} rx={12} ry={26} {...visuals('biceps')} />
          <Ellipse cx={167} cy={124} rx={12} ry={26} {...visuals('biceps')} />
          <ST x={33} y={128} textAnchor="middle" fontSize={7} fill={lc('biceps')}>Bi</ST>
          <ST x={167} y={128} textAnchor="middle" fontSize={7} fill={lc('biceps')}>Bi</ST>
        </G>

        {/* Triceps */}
        <G {...press('triceps')}>
          <Ellipse cx={19} cy={128} rx={9} ry={22} {...visuals('triceps')} />
          <Ellipse cx={181} cy={128} rx={9} ry={22} {...visuals('triceps')} />
          <ST x={19} y={132} textAnchor="middle" fontSize={6} fill={lc('triceps')}>Tri</ST>
          <ST x={181} y={132} textAnchor="middle" fontSize={6} fill={lc('triceps')}>Tri</ST>
        </G>

        {/* Core */}
        <G {...press('core')}>
          <Rect x={69} y={141} width={62} height={52} rx={8} {...visuals('core')} />
          <ST x={100} y={170} textAnchor="middle" fontSize={10} fill={lc('core')}>Core</ST>
        </G>

        {/* Quads */}
        <G {...press('quads')}>
          <Ellipse cx={81} cy={240} rx={22} ry={50} {...visuals('quads')} />
          <Ellipse cx={119} cy={240} rx={22} ry={50} {...visuals('quads')} />
          <ST x={100} y={244} textAnchor="middle" fontSize={9} fill={lc('quads')}>Quads</ST>
        </G>

        {/* Calves */}
        <G {...press('calves')}>
          <Ellipse cx={81} cy={334} rx={14} ry={30} {...visuals('calves')} />
          <Ellipse cx={119} cy={334} rx={14} ry={30} {...visuals('calves')} />
          <ST x={100} y={338} textAnchor="middle" fontSize={8} fill={lc('calves')}>Calves</ST>
        </G>
      </Svg>
    );
  }

  // ─── Back view ───
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
      {/* Non-interactive background */}
      <Ellipse cx={100} cy={36} rx={24} ry={28} {...bg} />
      <Rect x={89} y={62} width={22} height={18} {...bg} />
      <Rect x={70} y={196} width={60} height={18} rx={6} {...bg} />
      <Ellipse cx={25} cy={157} rx={9} ry={22} {...bg} />
      <Ellipse cx={175} cy={157} rx={9} ry={22} {...bg} />
      <Ellipse cx={81} cy={308} rx={14} ry={28} {...bg} />
      <Ellipse cx={119} cy={308} rx={14} ry={28} {...bg} />
      <Rect x={68} y={376} width={26} height={9} rx={4} {...bg} />
      <Rect x={106} y={376} width={26} height={9} rx={4} {...bg} />

      {/* Traps */}
      <G {...press('traps')}>
        <Ellipse cx={100} cy={94} rx={44} ry={18} {...visuals('traps')} />
        <ST x={100} y={99} textAnchor="middle" fontSize={9} fill={lc('traps')}>Traps</ST>
      </G>

      {/* Back */}
      <G {...press('back')}>
        <Ellipse cx={100} cy={133} rx={36} ry={26} {...visuals('back')} />
        <ST x={100} y={137} textAnchor="middle" fontSize={10} fill={lc('back')}>Back</ST>
      </G>

      {/* Lats */}
      <G {...press('lats')}>
        <Ellipse cx={64} cy={152} rx={18} ry={34} {...visuals('lats')} />
        <Ellipse cx={136} cy={152} rx={18} ry={34} {...visuals('lats')} />
        <ST x={64} y={156} textAnchor="middle" fontSize={7} fill={lc('lats')}>Lats</ST>
        <ST x={136} y={156} textAnchor="middle" fontSize={7} fill={lc('lats')}>Lats</ST>
      </G>

      {/* Glutes */}
      <G {...press('glutes')}>
        <Ellipse cx={83} cy={210} rx={26} ry={22} {...visuals('glutes')} />
        <Ellipse cx={117} cy={210} rx={26} ry={22} {...visuals('glutes')} />
        <ST x={100} y={214} textAnchor="middle" fontSize={9} fill={lc('glutes')}>Glutes</ST>
      </G>

      {/* Hamstrings */}
      <G {...press('hamstrings')}>
        <Ellipse cx={82} cy={272} rx={22} ry={50} {...visuals('hamstrings')} />
        <Ellipse cx={118} cy={272} rx={22} ry={50} {...visuals('hamstrings')} />
        <ST x={100} y={276} textAnchor="middle" fontSize={8} fill={lc('hamstrings')}>Hamstrings</ST>
      </G>

      {/* Calves */}
      <G {...press('calves')}>
        <Ellipse cx={82} cy={356} rx={14} ry={30} {...visuals('calves')} />
        <Ellipse cx={118} cy={356} rx={14} ry={30} {...visuals('calves')} />
        <ST x={100} y={360} textAnchor="middle" fontSize={8} fill={lc('calves')}>Calves</ST>
      </G>
    </Svg>
  );
}
