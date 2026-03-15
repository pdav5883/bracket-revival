import json
import pytest
from bracket_common import bracket_utils
from bracket_common import points
from bracket_common import tournament as trn

N = trn.NUMGAMES


class TestComputeCompletedRounds:
    def test_no_games_complete(self):
        results = [None] * N
        assert bracket_utils.compute_completed_rounds(results) == 0

    def test_partial_first_round(self):
        results = [1] * 10 + [None] * (N - 10)
        assert bracket_utils.compute_completed_rounds(results) == 0

    def test_first_round_complete(self):
        results = [1] * trn.GAMES_PER_ROUND[0] + [None] * sum(trn.GAMES_PER_ROUND[1:])
        assert bracket_utils.compute_completed_rounds(results) == 1

    def test_second_round_complete(self):
        results = (
            [1] * trn.GAMES_PER_ROUND[0]
            + [0] * trn.GAMES_PER_ROUND[1]
            + [None] * sum(trn.GAMES_PER_ROUND[2:])
        )
        assert bracket_utils.compute_completed_rounds(results) == 2

    def test_all_complete(self):
        results = [0] * N
        assert bracket_utils.compute_completed_rounds(results) == trn.NUMROUNDS


class TestPoints:
    def best_propagate_round(self, seeds_in):
        """
        Flat list of seeds in a round
        """
        if len(seeds_in) < 2:
            return None
        return [min(upper, lower) for upper, lower in zip(seeds_in[::2], seeds_in[1::2])]

    def best_propagate_all(self, round_start):
        if type(round_start[0]) is tuple:
            round_start = [seed for matchup in trn.SEEDS for seed in matchup]
        best_seeds = []
        round_start = self.best_propagate_round(round_start)

        while round_start is not None:
            best_seeds.extend(round_start)
            round_start = self.best_propagate_round(round_start)

        return best_seeds

    @pytest.fixture
    def start_best_seeds(self):
        return [1, 8, 5, 4, 6, 3, 7, 2,
                1, 8, 5, 4, 6, 3, 7, 2,
                1, 8, 5, 4, 6, 3, 7, 2,
                1, 8, 5, 4, 6, 3, 7, 2,
                1, 4, 3, 2, 1, 4, 3, 2,
                1, 4, 3, 2, 1, 4, 3, 2,
                1, 2, 1, 2, 1, 2, 1, 2,
                1, 1, 1, 1, 1, 1, 1]

    def test_helper_function(self, start_best_seeds):
        assert self.best_propagate_all([3, 6, 8, 14]) == [3, 8, 3]
        assert self.best_propagate_all(trn.SEEDS) == start_best_seeds

    def test_calc_best(self):
        no_results = [None] * N
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(no_results)
        ] == [self.best_propagate_all(trn.SEEDS)]

        one_result = [1] + [None] * (N - 1)
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(one_result)
        ] == [self.best_propagate_all(trn.SEEDS)]

        first_round_complete = (
            [1] * trn.GAMES_PER_ROUND[0]
            + [None] * sum(trn.GAMES_PER_ROUND[1:])
        )

        start_second = [matchup[1] for matchup in trn.SEEDS]
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(first_round_complete)
        ] == [
            self.best_propagate_all(trn.SEEDS),
            self.best_propagate_all(start_second),
        ]

        second_round_complete = (
            [1] * trn.GAMES_PER_ROUND[0]
            + [0] * trn.GAMES_PER_ROUND[1]
            + [None] * sum(trn.GAMES_PER_ROUND[2:])
        )
        start_third = [seed for seed in start_second[::2]]
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(second_round_complete)
        ] == [
            self.best_propagate_all(trn.SEEDS),
            self.best_propagate_all(start_second),
            self.best_propagate_all(start_third),
        ]

        fifth_round_complete = (
            [1] * trn.GAMES_PER_ROUND[0]
            + [0] * trn.GAMES_PER_ROUND[1]
            + [1] * trn.GAMES_PER_ROUND[2]
            + [0] * trn.GAMES_PER_ROUND[3]
            + [1] * trn.GAMES_PER_ROUND[4]
            + [None] * trn.GAMES_PER_ROUND[5]
        )
        start_fourth = [seed for seed in start_third[1::2]]
        start_fifth = [seed for seed in start_fourth[::2]]
        start_sixth = [seed for seed in start_fifth[1::2]]
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(fifth_round_complete)
        ] == [
            self.best_propagate_all(trn.SEEDS),
            self.best_propagate_all(start_second),
            self.best_propagate_all(start_third),
            self.best_propagate_all(start_fourth),
            self.best_propagate_all(start_fifth),
            self.best_propagate_all(start_sixth),
        ]

        sixth_round_complete = (
            [1] * trn.GAMES_PER_ROUND[0]
            + [0] * trn.GAMES_PER_ROUND[1]
            + [1] * trn.GAMES_PER_ROUND[2]
            + [0] * trn.GAMES_PER_ROUND[3]
            + [1] * trn.GAMES_PER_ROUND[4]
            + [0] * trn.GAMES_PER_ROUND[5]
        )
        assert [
            [min(m) for m in m_round]
            for m_round in points.calc_best_matchup(sixth_round_complete)
        ] == [
            self.best_propagate_all(trn.SEEDS),
            self.best_propagate_all(start_second),
            self.best_propagate_all(start_third),
            self.best_propagate_all(start_fourth),
            self.best_propagate_all(start_fifth),
            self.best_propagate_all(start_sixth),
        ]

    def test_underdog_revival(self):
        # no games played
        results = [None] * N
        picks = [[0] * N]
        base = [0] * N
        mult = [0] * N
        assert points.calc_points_underdog_revival(picks, results) == (base, mult)

        # everything wrong
        results = [0] * N
        picks = [[1] * sum(trn.GAMES_PER_ROUND[i:]) for i in range(trn.NUMROUNDS)]
        base = [0] * N
        mult = [0] * N
        assert points.calc_points_underdog_revival(picks, results) == (base, mult)

        # first 8 picks correct
        results = [1] * 8 + [None] * (N - 8)
        picks = [[1] * N]
        base = [5, 1, 3, 4, 2, 4, 2, 5] + [0] * (N - 8)
        mult = [1] * 8 + [0] * (N - 8)
        assert points.calc_points_underdog_revival(picks, results) == (base, mult)

        # 16/1 upset then 16/8 upset
        results = [1] + [0] * 31 + [0] + [None] * (N - 33)
        picks = [[1] * N, [0] * (N - 32)]
        picks[0][32] = 0
        base = [5] + [0] * 31 + [3] + [0] * (N - 33)
        mult = [1] + [0] * 31 + [2] + [0] * (N - 33)
        assert points.calc_points_underdog_revival(picks, results) == (base, mult)

        # get second round pick correct second time
        results = [1] * 33 + [None] * (N - 33)
        picks = [[0] * N, [1] + [0] * (N - 33)]
        base = [0] * N
        base[32] = 1
        mult = [0] * N
        mult[32] = 1
        assert points.calc_points_underdog_revival(picks, results) == (base, mult)


# SEEDS = 4 * [(1, 16), (8, 9), (5, 12), (4, 13), (6, 11), (3, 14), (7, 10), (2, 15)]

# 0-2: 1 pts
# 3-5: 2 pts
# 6-8: 3 pts
# 9-11: 4 pts
# 12-15: 5 pts
